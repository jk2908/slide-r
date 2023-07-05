Include web component in your bundle via import or script tag:
```
  import './slide-r.js'

  <script src="slide-r.js"></script>
```

In your markup:
```
  <slide-r>
    <li slot="slide">Slide one</li>
    ... 
  </slide-r>
```

Configuration options are set as attributes on the `slide-r` element. For boolean options where the default is false, you can either include the attribute alone `<slide-r autoplay>` or `<slide-r autoplay=true>`. Where the default is true, you would need to specify false as the attribute value `<slide-r controls="false">`. Possible options:
- `slider-style`: 'slide', 'fade', 'carousel'. Attribute is not needed if you want 'slide' as that's the default
- `pagination-style`: 'numbers', 'dots', 'both', 'none'. Numbers is the default. If you choose dots then numbers are hidden using the 'sr-only' class so the pagination is still accessible
- `autoplay`: The autoplay function will be destroyed (paused) once the buttons are interacted with or the slider is swiped
- `playback-rate`: Time in milliseconds between each slide when it's autoplaying
- `loop`: When on the last slide, pressing the next button or swiping left would take you back to the first slide etc. Also works with `autoplay` for a looping slideshow effect
- `allow-swiping`: Default is true, set to false to not allow swipe actions. We won't setup the events for them if false.
- `prepend-id`: Default is true. Prepends the slider id on to any events that are dispatched. So once the slider is ready you would listen for `mySliderId:ready` or on change `mySliderId:change`. You can either add your own id directly to the `<slide-r>` element or if you don't, we'll add our own id `sl1d3-r__0` where the number (in this case 0) is determined by the target sliders index in an array of sliders on the current page
- `controls`: Default is true. Set to false to hide buttons
- `pagination-numbers-divider`: The character to use to divide the numbers. Defaults to '/'. For example, *Slide* '1/2'

Events that can be listened for:
- `ready`
- `change`
- `resize`
- `autoplaystart`
- `autoplaystop`
- `swipestart`
- `swipeend`
- `destroy` - when slider is removed from DOM

If the slider is using the default 'slide' style, then there may be situations where there are more than one slides visible per page, dependent on the CSS config for the slides. When resizing the screen the amount of slides visible per page may change, which the slider will detect and update the amount of pages needed, re-rendering the pagination dots (if using them). It will either reset the track transform value to the current slide or to the first slide (if the amount of slides per page has changed). The 'fade' setting ensures that there is always on one slide visible so resize doesn't matter. Whilst the 'carousel' setting also only shows one slide per page - although you can technically see the previous and next slides to come in on the left and right, this is just stylistic and there are not interactive (i.e. they have aria-hidden=false) on them. 

There are these custom properties + default values that you can override:
- `--sl1d3-r-root-direction, column`
- `--sl1d3-r-root-gap, 10px`
- `--sl1d3-r-track-transition, transform var(--sl1d3-r-track-transition-duration, ${defaultTransitionDuration}ms) cubic-bezier(1, 0, 0.2, 1)` - where the default transition duration is 250ms. Either update `--sl1d3-r-track-transition` to change the whole transition or just `--sl1d3-r-track-transition-duration` for duration. If you update the whole transition then also update the duration. Like this: 
```
  --sl1d3-r-track-transition-duration: 500ms
  --sl1d3-r-track-transition: transform --sl1d3-r-track-transition-duration [effect]
```
... as the duration is used in the slider mechanics. Also update this property on the `:root` or `slide-r` element itself. Only relevant when using default slider style.
- `--sl1d3-r-list-display, flex`
- `--sl1d3-r-list-gap, 0px`
- `--sl1d3-r-control-panel-align-items, center`
- `--sl1d3-r-control-panel-direction, row`
- `--sl1d3-r-control-panel-gap, 10px`
- `--sl1d3-r-control-panel-justify-content, center`
- `--sl1d3-r-controls-align-items, center`
- `--sl1d3-r-controls-gap, 10px`
- `--sl1d3-r-controls-justify-content, center`
- `--sl1d3-r-pagination-direction, column`
- `--sl1d3-r-pagination-gap, 10px`
- `--sl1d3-r-pagination-dots-wrapper-gap, 5px`
- `--sl1d3-r-pagination-dot-bg, transparent` [data-state=inactive]
- `--sl1d3-r-pagination-dot-size, 5px`
- `--sl1d3-r-pagination-dot-border, 1px solid #000`
- `--sl1d3-r-pagination-dot-bg: #000` [data-state=active]
- `--sl1d3-r-button-opacity, 0.5` [disabled]
- `--sl1d3-r-slide-flex, 1 0 100%` when using default 'slide' style
- `--sl1d3-r-slide-transition, opacity var(--sl1d3-r-slide-transition-duration, ${defaultTransitionDuration}ms) cubic-bezier(1, 0, 0.2, 1)` when using 'fade' style
- `--sl1d3-r-slide-transition, inset var(--sl1d3-r-slide-transition-duration, ${defaultTransitionDuration}ms) cubic-bezier(1, 0, 0.2, 1)` when using 'carousel' style

You can also access most parts of the slider from your external CSS using the `::part` pseudo selector. For example:
```
  slide-r::part(track) {
    background-color: blue;
  }
```

Parts: 'root', 'track', 'list', 'control-panel', 'controls', 'pagination', 'pagination-dots-wrapper', 'pagination-dot', 'pagination-numbers-wrapper', 'previous-button', 'next-button'

You also have the 'slide' and 'additional-content' slots. The slide slot is for your ... slides. `<li slot="slide"></li>` Whilst the 'additional-content' slot will appear (if using default CSS) beneath the controls and pagination, inside the control-panel part. You can access these slots from external CSS by targetting them like:
```
  [slot=slide] {
    background-color: blue;
  }
```

When the slider style is set to 'carousel', some basic styles to apply might be:

```
  slide-r {

    * as slides are absolutely positoned
    * this

    &::part(list) {
      block-size: [define block size]
    }

    * or

    &::part(root) {
      --sl1d3-r-root-gap: [increase root gap]
    }

    * also

    & [slot=slide] {
      --sl1d3-r-slide-transition-duration: 250ms [need to re-specify this]
      --sl1d3-r-slide-transition: inset var(--sl1d3-r-slide-transition-duration) cubic-bezier(1, 0, 0.2, 1), scale var(--sl1d3-r-slide-transition-duration) [effect]

      background-color: [define a bg]
    }

    & [slot=slide][aria-hidden=false] {
      --sl1d3-r-slide-transform: translateX(-50%) scale(1.2) [extend transform to make current slide bigger]

      z-index: [higher than other slides]
    }
  }
```