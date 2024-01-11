const initialState = {
  isReady: false,
  id: undefined,
  visibleSlidesCount: undefined,
  currentSlides: [],
  slideCount: 0,
  currentPagination: 1,
  totalPagination: undefined,
  paginationStyle: 'numbers',
  paginationNumbersDivider: '/',
  hideSinglePagination: true,
  sliderStyle: 'default',
  transitionDuration: 250,
  isMoving: false,
  autoplay: false,
  playbackRate: 5000,
  loop: false,
  prependId: true,
  allowSwiping: true,
  controls: true,
}

const initialSwipeStore = {
  startX: 0,
  endX: 0,
  threshold: 50,
}

const defaultTransitionDuration = 250

function debounce(callback, wait) {
  let timeoutId = null

  return (...args) => {
    window.clearTimeout(timeoutId)

    timeoutId = window.setTimeout(() => {
      callback.apply(null, args)
    }, wait)
  }
}

export class Slider extends HTMLElement {
  #state
  #swipeStore
  #autoplayFn

  constructor() {
    super()

    this.attachShadow({ mode: 'open' })
    this.#state = { ...initialState }
    this.#swipeStore = { ...initialSwipeStore }
    this.#autoplayFn = null
    this.controller = new AbortController()
  }

  static get observedAttributes() {
    return []
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return

    this[property] = newValue
  }

  get state() {
    return this.#state
  }

  set state(newState) {
    this.#state = { ...this.#state, ...newState }
  }

  get swipeStore() {
    return this.#swipeStore
  }

  set swipeStore(newState) {
    this.#swipeStore = { ...this.#swipeStore, ...newState }
  }

  get autoplayFn() {
    return this.#autoplayFn
  }

  set autoplayFn(fn) {
    this.#autoplayFn = fn
  }

  get root() {
    return this.shadowRoot.querySelector('[part=root]')
  }

  get track() {
    return this.shadowRoot.querySelector('[part=track]')
  }

  set trackTranslateValue(newValue) {
    this.track.style.transform = `translate3d(${newValue}px, 0, 0)`
  }

  get list() {
    return this.shadowRoot.querySelector('[part=list]')
  }

  get slides() {
    return Array.from(this.querySelectorAll('[slot=slide]'))
  }

  get pagination() {
    return this.shadowRoot.querySelector('[part=pagination]')
  }

  get paginationNumbersWrapper() {
    return this.shadowRoot.querySelector('[part=pagination-numbers-wrapper]')
  }

  get paginationDotsWrapper() {
    return this.shadowRoot.querySelector('[part=pagination-dots-wrapper]')
  }

  get paginationDots() {
    return Array.from(this.shadowRoot.querySelectorAll('[part=pagination-dot]'))
  }

  get controlPanel() {
    return this.shadowRoot.querySelector('[part=control-panel]')
  }

  get controls() {
    return this.shadowRoot.querySelector('[part=controls]')
  }

  get previousButton() {
    return this.shadowRoot.querySelector('[part=previous-button]')
  }

  get nextButton() {
    return this.shadowRoot.querySelector('[part=next-button]')
  }

  get slideWidth() {
    return this.slides[0].offsetWidth
  }

  get currentTrackTranslateValue() {
    const [, currentTranslateValue] = this.track.style.transform.match(
      /translate3d\((-?\d+)px/
    ) || [, 0]

    return parseFloat(currentTranslateValue)
  }

  get newTrackTranslateValue() {
    const { slideCount } = this.state
    const multipliedSlideWidth = this.slideWidth * slideCount
    const multipliedListGap = (parseFloat(getComputedStyle(this.list).gap) || 0) * slideCount

    return -(multipliedSlideWidth + multipliedListGap)
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          contain: layout style;
          display: block;
          font: inherit;
          position: relative;
        }

        :host::part(root) {
          display: flex;
          flex-direction: var(--sl1d3-r-root-direction, column);
          gap: var(--sl1d3-r-root-gap, 10px);
          overflow: hidden;
        }

        :host([slider-style=carousel])::part(root) {
          overflow: visible;
        }

        :host::part(track) {
          transition: 
            var(--sl1d3-r-track-transition, transform var(--sl1d3-r-track-transition-duration, ${defaultTransitionDuration}ms) cubic-bezier(1, 0, 0.2, 1));
        }

        :host([slider-style=fade])::part(track), :host([slider-style=carousel])::part(track) {
          --sl1d3-r-track-transition: none;
        }
        
        :host::part(list) {
          display: var(--sl1d3-r-list-display, flex);
          gap: var(--sl1d3-r-list-gap, 0px);
          list-style: none;
          margin: 0;
          padding: 0;
        }

        :host([slider-style=fade])::part(list) {
          display: grid;
        }

        :host([slider-style=carousel])::part(list) {
          display: block;
          position: relative;
        }

        :host::part(control-panel) {
          align-items: var(--sl1d3-r-control-panel-align-items, center);
          display: flex;
          flex-direction: var(--sl1d3-r-control-panel-direction, row);
          gap: var(--sl1d3-r-control-panel-gap, 10px);
          justify-content: var(--sl1d3-r-control-panel-justify-content, center);
        }

        :host::part(controls) {
          align-items: var(--sl1d3-r-controls-align-items, center);
          display: flex;
          gap: var(--sl1d3-r-controls-gap, 10px);
          justify-content: var(--sl1d3-r-controls-justify-content, center);
        }

        :host::part(pagination) {
          align-items: center;
          display: flex;
          flex-direction: var(--sl1d3-r-pagination-direction, column);
          gap: var(--sl1d3-r-pagination-gap, 10px);
          justify-content: center;
        }

        :host::part(pagination-dots-wrapper) {
          display: flex;
          gap: var(--sl1d3-r-pagination-dots-wrapper-gap, 5px);
        }

        :host::part(pagination-dot) {
          aspect-ratio: 1 / 1;
          background-color: var(--sl1d3-r-pagination-dot-bg, transparent);
          block-size: var(--sl1d3-r-pagination-dot-size, 5px);
          border: var(--sl1d3-r-pagination-dot-border, 1px solid #000);
          border-radius: 50%;
        }

        :host div[data-state=active] {
          --sl1d3-r-pagination-dot-bg: #000;
        }

        :host button[aria-label*=slide] {
          align-items: center;
          display: flex;
          justify-content: center;
        }

        :host button[aria-label*=slide]:disabled, 
        ::slotted([slot=previous-button]),
        ::slotted([slot=next-button]) {
          opacity: var(--sl1d3-r-button-opacity, 0.5);
          pointer-events: none;
          user-select: none;
        }

        ::slotted([slot=slide]) {
          flex: var(--sl1d3-r-slide-flex, 1 0 100%);
          user-select: none;
        }

        :host([slider-style=fade]) ::slotted([slot=slide]) {
          flex: none;
          grid-area: 1 / 1;
          opacity: 0;
          transition: 
            var(--sl1d3-r-slide-transition, opacity var(--sl1d3-r-slide-transition-duration, ${defaultTransitionDuration}ms) cubic-bezier(1, 0, 0.2, 1));
        }

        :host([slider-style=fade]) ::slotted([slot=slide]:first-child) {
          opacity: 1;
        }

        :host([slider-style=carousel]) ::slotted([slot=slide]) {
          inset: 0 auto auto 50%;
          position: absolute;
          transform: translateX(-50%);
          transition: var(--sl1d3-r-slide-transition, inset var(--sl1d3-r-slide-transition-duration, ${defaultTransitionDuration}ms) cubic-bezier(1, 0, 0.2, 1));
        }

        :host([slider-style=carousel]) ::slotted([slot=slide]:nth-child(2)) {
          inset: 0 auto auto 100%;
        }

        :host([slider-style=carousel]) ::slotted([slot=slide]:last-child) {
          inset: 0 auto auto 0;
        }

        .sr-only {
          block-size: auto;
          border: 0;
          clip: rect(0 0 0 0);
          inline-size: 1px;
          margin: 0;
          padding: 0;
          position: absolute;
          overflow: hidden;
          white-space: nowrap;
        }
      </style>

      <div part="root" role="region" aria-roledescription="carousel">
        <div part="track" aria-atomic="true" aria-busy="false" aria-live="polite">
          <div part="list" role="presentation">
            <slot name="slide"></slot>
          </div>
        </div>
        <div part="control-panel">
          <div part="controls">
            <button part="previous-button" type="button" aria-label="Previous slide">
              <slot name="previous-button" part="slide">Previous</slot>
            </button>
            <div part="pagination" aria-live="polite">
              <div part="pagination-numbers-wrapper" aria-label="Page"></div>
              <div part="pagination-dots-wrapper"></div>
            </div>
            <button part="next-button" type="button" aria-label="Next slide">
              <slot name="next-button">Next</slot>
            </button>
          </div>
          <slot name="additional-content"></slot>
        </div>
      </div>
    `
    const { signal } = this.controller

    this.controls.addEventListener(
      'click',
      e => {
        const { isMoving } = this.state
        const targetElement = e.target.closest('button')

        if (targetElement && !isMoving) {
          const direction = targetElement === this.previousButton ? 'previous' : 'next'

          this.handleChange({ direction, origin: 'controls' })
        }
      },
      { signal }
    )

    window.addEventListener('resize', this.handleResize.bind(this), { signal })

    queueMicrotask(async () => {
      await this.setInitialState()

      const { allowSwiping } = this.state

      if (allowSwiping) {
        this.track.addEventListener('touchstart', this.handleSwipeStart.bind(this), { signal, passive: true })
        this.track.addEventListener('touchmove', this.handleSwipeMove.bind(this), { signal, passive: true })
        this.track.addEventListener('touchend', this.handleSwipeEnd.bind(this), { signal, passive: true })
        this.track.addEventListener('mousedown', this.handleSwipeStart.bind(this), { signal })
        this.track.addEventListener('mousemove', this.handleSwipeMove.bind(this), { signal })
        this.track.addEventListener('mouseup', this.handleSwipeEnd.bind(this), { signal })
      }

      this.paginationDotsWrapper.addEventListener(
        'click',
        e => {
          const { isMoving } = this.state
          const targetElement = e.target.closest('[part=pagination-dot]')

          if (targetElement && !isMoving) {
            const jumpToPagination = this.paginationDots.indexOf(targetElement) + 1

            this.handleChange({ jumpToPagination, origin: 'pagination-dots' })
          }
        },
        { signal }
      )

      this.renderElements({ initialRender: true })
      this.setAttributes()
      this.setAutoplayFn()
      this.state = { isReady: true }
      this.dispatch({ eventType: 'ready' })
    })
  }

  disconnectedCallback() {
    this.controller.abort()

    if (this.autoplayFn) {
      clearInterval(this.autoplayFn)
      this.autoplayFn = null
    }

    this.state = { isReady: false }
    this.dispatch({ eventType: 'destroy' })
  }

  async setInitialState() {
    const id = this.getAttribute('id')
    const paginationStyle = this.getAttribute('pagination-style')
    const paginationNumbersDivider = this.getAttribute('pagination-numbers-divider')
    const hideSinglePagination = this.getAttribute('hide-single-pagination')
    const sliderStyle = this.getAttribute('slider-style')
    const transitionDuration =
      getComputedStyle(document.documentElement).getPropertyValue(
        '--sl1d3-r-track-transition-duration'
      ) ||
      getComputedStyle(this).getPropertyValue('--sl1d3-r-track-transition-duration') ||
      defaultTransitionDuration
    const autoplay = this.getAttribute('autoplay') || this.hasAttribute('autoplay')
    const playbackRate = this.getAttribute('playback-rate')
    const loop = this.getAttribute('loop') || this.hasAttribute('loop')
    const prependId = this.getAttribute('prepend-id') || this.hasAttribute('prepend-id')
    const allowSwiping = this.getAttribute('allow-swiping') || this.hasAttribute('allow-swiping')
    const controls = this.getAttribute('controls') || this.hasAttribute('controls')

    if (id) {
      this.state = { id }
    } else {
      this.state = {
        id:
          'sl1d3-r__' +
          Array.from(document.querySelectorAll(this.tagName.toLowerCase())).indexOf(this),
      }
    }

    this.state = {
      visibleSlidesCount: await this.getVisibleSlidesCount(),
    }

    this.state = {
      currentSlides: [...this.getVisibleSlides()],
    }

    this.state = {
      totalPagination: Math.ceil(this.slides.length / this.state.visibleSlidesCount),
    }

    if (paginationStyle && ['numbers', 'dots', 'both', 'none'].includes(paginationStyle)) {
      this.state = { paginationStyle }
    }

    if (paginationNumbersDivider) {
      this.state = { paginationNumbersDivider }
    }

    if (hideSinglePagination) {
      this.state = { hideSinglePagination: hideSinglePagination === 'false' ? false : true }
    }

    if (sliderStyle && ['fade', 'carousel'].includes(sliderStyle)) {
      this.state = { sliderStyle }
    }

    if (transitionDuration) {
      this.state = {
        transitionDuration: isNaN(transitionDuration)
          ? transitionDuration.includes('ms')
            ? parseFloat(transitionDuration)
            : parseFloat(transitionDuration) * 1000
          : transitionDuration,
      }
    }

    if (autoplay) {
      this.state = { autoplay: autoplay === 'false' ? false : true }
    }

    if (playbackRate) {
      this.state = { playbackRate: parseFloat(playbackRate) }
    }

    if (loop) {
      this.state = { loop: loop === 'false' ? false : true }
    }

    if (prependId) {
      this.state = { prependId: prependId === 'false' ? false : true }
    }

    if (allowSwiping) {
      this.state = { allowSwiping: allowSwiping === 'false' ? false : true }
    }

    if (controls) {
      this.state = { controls: controls === 'false' ? false : true }
    }
  }

  setAttributes() {
    const {
      id,
      paginationStyle,
      hideSinglePagination,
      visibleSlidesCount,
      sliderStyle,
      loop,
      allowSwiping,
      controls,
      currentPagination,
      totalPagination,
    } = this.state

    this.id = id
    this.track.id = id + '-track'

    if (controls) {
      const hideControls = hideSinglePagination && totalPagination === 1

      this.previousButton.setAttribute('aria-controls', id + '-track')
      this.nextButton.setAttribute('aria-controls', id + '-track')

      this.previousButton.disabled = !loop && currentPagination === 1
      this.nextButton.disabled = !loop && currentPagination === totalPagination

      this.controls.style.setProperty(
        'display', 
        hideControls ? 'none' : getComputedStyle(this.controls).display,
        hideControls ? 'important' : ''
      )
    }

    this.slides.forEach((slide, i) => {
      slide.setAttribute('role', 'group')
      slide.setAttribute('aria-roledescription', 'slide')
      slide.setAttribute('aria-label', i + 1 + ' of ' + this.slides.length)
    })

    this.paginationNumbersWrapper.className = paginationStyle === 'dots' ? 'sr-only' : ''
    this.pagination.className = paginationStyle === 'none' ? 'sr-only' : ''
    this.track.style.cursor = allowSwiping ? 'grab' : 'default'

    if (['dots', 'both'].includes(paginationStyle)) {
      this.paginationDots.forEach((dot, i) => {
        dot.setAttribute('data-state', i === 0 ? 'active' : 'inactive')
        dot.setAttribute('aria-current', i === 0)
      })
    }

    if (sliderStyle === 'carousel') {
      this.slides[0].setAttribute('data-state', 'active')
      this.slides[this.slides.length - 1].setAttribute('data-state', 'previous')
      this.slides[1].setAttribute('data-state', 'next')

      for (let i = 2; i < this.slides.length - 1; i++) {
        this.slides[i].setAttribute('data-state', 'inactive')
      }

      this.list.style.blockSize = Math.max(...this.slides.map(slide => slide.offsetHeight)) + 'px'
    }
  }

  updateAttributes() {
    const {
      currentSlides,
      currentPagination,
      totalPagination,
      paginationStyle,
      hideSinglePagination,
      sliderStyle,
      isMoving,
      loop,
      controls,
    } = this.state

    this.track.setAttribute('aria-busy', isMoving)

    if (!loop && controls) {
      const hideControls = hideSinglePagination && totalPagination === 1

      this.previousButton.disabled = currentPagination === 1
      this.nextButton.disabled = currentPagination === totalPagination

      this.controls.style.setProperty(
        'display', 
        hideControls ? 'none' : getComputedStyle(this.controls).display,
        hideControls ? 'important' : ''
      )
    }

    if (['dots', 'both'].includes(paginationStyle)) {
      for (const dot of this.paginationDots) {
        dot.setAttribute(
          'data-state',
          dot === this.paginationDots[currentPagination - 1] ? 'active' : 'inactive'
        )
        dot.setAttribute('aria-current', dot === this.paginationDots[currentPagination - 1])
      }
    }

    if (sliderStyle === 'carousel') {
      this.slides.forEach(slide => {
        slide.setAttribute(
          'data-state',
          slide === currentSlides[0]
            ? 'active'
            : this.slides.indexOf(slide) ===
              (this.slides.indexOf(currentSlides[0]) - 1 + this.slides.length) % this.slides.length
            ? 'previous'
            : this.slides.indexOf(slide) ===
              (this.slides.indexOf(currentSlides[0]) + 1 + this.slides.length) % this.slides.length
            ? 'next'
            : 'inactive'
        )
      })
    }
  }

  getVisibleSlidesCount() {
    const { isReady, sliderStyle: stateSliderStyle } = this.state
    const sliderStyle = isReady
      ? stateSliderStyle
      : ['fade', 'carousel'].includes(this.getAttribute('slider-style'))
      ? this.getAttribute('slider-style')
      : 'default'
    const trackWidth = this.track.offsetWidth
    const listGap = parseFloat(getComputedStyle(this.list).gap)

    return new Promise(resolve => {
      if (sliderStyle === 'fade' || sliderStyle === 'carousel') {
        resolve(1)
      }

      resolve(Math.floor(trackWidth / (this.slideWidth + (listGap || 0))))
    })
  }

  getVisibleSlides({
    direction,
    isLooping = false,
    fromFirstCurrent = false,
    fromFirst = false,
    jumpToPagination,
    visibleSlidesCount,
  } = {}) {
    const { currentSlides, visibleSlidesCount: stateVisibleSlidesCount } = this.state
    visibleSlidesCount = visibleSlidesCount || stateVisibleSlidesCount

    if (!currentSlides.length || (isLooping && direction === 'next') || fromFirst) {
      return this.slides.slice(0, visibleSlidesCount)
    }

    if (isLooping && direction === 'previous') {
      return this.slides.slice(this.slides.length - visibleSlidesCount, this.slides.length)
    }

    if (fromFirstCurrent) {
      return this.slides.slice(this.slides.indexOf(currentSlides[0]), visibleSlidesCount)
    }

    if (jumpToPagination) {
      return this.slides.slice(jumpToPagination - visibleSlidesCount, jumpToPagination)
    }

    const startingPoint =
      direction === 'previous'
        ? this.slides.indexOf(currentSlides[currentSlides.length - 1])
        : this.slides.indexOf(currentSlides[0])

    return direction === 'previous'
      ? this.slides.slice(startingPoint - visibleSlidesCount, startingPoint)
      : this.slides.slice(
          startingPoint + visibleSlidesCount,
          startingPoint + visibleSlidesCount * 2
        )
  }

  renderElements({ initialRender = false, recalculated = false } = {}) {
    const {
      currentPagination,
      totalPagination,
      paginationStyle,
      paginationNumbersDivider,
      controls,
    } = this.state

    if (initialRender && paginationStyle === 'numbers') {
      this.paginationDotsWrapper.remove()
    }

    if (initialRender && !controls) {
      this.previousButton.remove()
      this.nextButton.remove()
    }

    if (!Number.isFinite(currentPagination) || !Number.isFinite(totalPagination)) return

    if ((initialRender || recalculated) && ['dots', 'both'].includes(paginationStyle)) {
      const paginationDot = document.createElement('div')
      const fragment = document.createDocumentFragment()

      paginationDot.part = 'pagination-dot'
      this.paginationDotsWrapper.innerHTML = ''

      for (let i = 0; i < totalPagination; i++) {
        fragment.appendChild(paginationDot.cloneNode(true))
      }

      this.paginationDotsWrapper.appendChild(fragment)
    }

    this.paginationNumbersWrapper.innerHTML =
      currentPagination + paginationNumbersDivider + totalPagination
  }

  setAutoplayFn() {
    const { autoplay, playbackRate } = this.state

    if (!autoplay) return

    this.autoplayFn = setInterval(() => {
      const { currentPagination, totalPagination, loop } = this.state

      if (currentPagination === totalPagination && !loop) {
        this.clearAutoplayFn()
        return
      }

      this.handleChange({ direction: 'next', origin: 'autoplay' })
    }, playbackRate)

    this.dispatch({
      eventType: 'autoplaystart',
      payload: { autoplayFn: this.autoplayFn },
    })
  }

  clearAutoplayFn() {
    if (!this.autoplayFn) return

    clearInterval(this.autoplayFn)
    this.autoplayFn = null

    this.dispatch({
      eventType: 'autoplaystop',
      payload: { autoplayFn: this.autoplayFn },
    })
  }

  handleChange({ direction, origin, jumpToPagination } = {}) {
    const {
      slideCount,
      currentPagination,
      totalPagination,
      visibleSlidesCount,
      sliderStyle,
      transitionDuration,
      autoplay,
      loop,
    } = this.state
    const isLooping =
      loop &&
      ((direction === 'previous' && currentPagination === 1) ||
        (direction === 'next' && currentPagination === totalPagination))

    direction =
      !direction && jumpToPagination
        ? currentPagination > jumpToPagination
          ? 'previous'
          : 'next'
        : direction

    if (autoplay && origin !== 'autoplay') {
      this.clearAutoplayFn()
    }

    const slideCountCalculation = !jumpToPagination
      ? isLooping
        ? direction === 'previous'
          ? this.slides.length - visibleSlidesCount
          : 0
        : direction === 'previous'
        ? slideCount - visibleSlidesCount
        : slideCount + visibleSlidesCount
      : jumpToPagination * visibleSlidesCount - visibleSlidesCount
    const currentPaginationCalculation = !jumpToPagination
      ? isLooping
        ? direction === 'previous'
          ? totalPagination
          : 1
        : currentPagination + (direction === 'previous' ? -1 : 1)
      : jumpToPagination    

    this.state = {
      slideCount: slideCountCalculation,
      currentPagination: currentPaginationCalculation,
      currentSlides: this.getVisibleSlides({
        direction,
        isLooping,
        jumpToPagination,
      }),
      isMoving: true,
    }

    {
      const { currentSlides } = this.state

      switch (sliderStyle) {
        case 'fade':
          this.slides.forEach(slide => {
            slide.style.opacity = currentSlides.includes(slide) ? 1 : 0
          })
          break
        case 'carousel':
          this.slides.forEach(slide => {
            slide.style.inset = `0 auto auto ${
              this.slides.indexOf(slide) === this.slides.indexOf(currentSlides[0])
                ? '50%'
                : this.slides.indexOf(slide) ===
                  (this.slides.indexOf(currentSlides[0]) - 1 + this.slides.length) %
                    this.slides.length
                ? '0'
                : this.slides.indexOf(slide) ===
                  (this.slides.indexOf(currentSlides[0]) + 1 + this.slides.length) %
                    this.slides.length
                ? '100%'
                : '50%'
            }`
          })
          break
        default:
          this.trackTranslateValue =
            isLooping && direction === 'next' ? 0 : this.newTrackTranslateValue
      }
    }

    this.updateAttributes()

    this.dispatch({
      eventType: 'change',
      payload: { direction, origin },
    })

    setTimeout(() => {
      this.state = { isMoving: false }
      this.updateAttributes()
      this.renderElements()
    }, transitionDuration)
  }

  handleResize = debounce(async () => {
    const { visibleSlidesCount: oldVisibleSlidesCount, sliderStyle } = this.state
    const newVisibleSlidesCount = await this.getVisibleSlidesCount()

    if (sliderStyle === 'default') {
      this.trackTranslateValue =
        oldVisibleSlidesCount !== newVisibleSlidesCount ? 0 : this.newTrackTranslateValue
    }

    if (oldVisibleSlidesCount !== newVisibleSlidesCount) {
      this.state = {
        slideCount: 0,
        currentPagination: 1,
        totalPagination: Math.ceil(this.slides.length / newVisibleSlidesCount),
        visibleSlidesCount: newVisibleSlidesCount,
        currentSlides: this.getVisibleSlides({
          fromFirst: true,
          visibleSlidesCount: newVisibleSlidesCount,
        }),
      }

      this.renderElements({ recalculated: true })
      this.updateAttributes()
    }

    this.dispatch({
      eventType: 'resize',
      payload: {
        oldVisibleSlidesCount,
        newVisibleSlidesCount,
        hasRerendered: oldVisibleSlidesCount !== newVisibleSlidesCount,
      },
    })
  }, 500)

  handleSwipeStart(e) {
    if (this.state.isMoving) return

    this.swipeStore = {
      startX: e.touches ? e.touches[0].clientX : e.clientX,
    }

    this.state = { isMoving: true }

    this.dispatch({
      eventType: 'swipestart',
      payload: this.swipeStore,
    })
  }

  handleSwipeMove(e) {
    e.preventDefault()

    if (!this.swipeStore.startX) return

    this.swipeStore = {
      endX: e.touches ? e.touches[0].clientX : e.clientX,
    }
  }

  handleSwipeEnd() {
    const { startX, endX, threshold } = this.swipeStore
    const { currentPagination, totalPagination, transitionDuration } = this.state
    const swipeDistance = endX - startX
    const direction = swipeDistance > 0 ? 'previous' : 'next'

    if (
      endX &&
      ((direction === 'previous' && currentPagination !== 1) ||
        (direction === 'next' && currentPagination !== totalPagination)) &&
      Math.abs(swipeDistance) > threshold
    ) {
      this.handleChange({ direction, origin: 'swipe' })
    }

    setTimeout(() => {
      this.state = { isMoving: false }
    }, transitionDuration)

    this.dispatch({
      eventType: 'swipeend',
      payload: this.swipeStore,
    })

    this.swipeStore = { ...initialSwipeStore }
  }

  dispatch({ eventType, payload = {} }) {
    const { id, prependId } = this.state
    eventType = prependId ? id + ':' + eventType : eventType

    const eventData = {
      state: this.state,
      payload,
    }

    const eventInstance = new CustomEvent(eventType, {
      bubbles: true,
      detail: { eventData },
    })

    this.dispatchEvent(eventInstance)
  }
}

if (!customElements.get('slide-r')) {
  customElements.define('slide-r', Slider)
}
