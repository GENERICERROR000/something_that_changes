# Something That Changes

Over time...

## Notes

- externalize symptoms
    - most are internal and other are unaware
    - only way to share is to tell
        - this clock makes it knowable without directly asking
    - also, as T1's age, they begin to feel symptoms less
        - this is also a way to make oneself aware
- meant for use in a space with people who one feels comfortable sharing this information with

## BG Timetable

- effects:
    - high:
        - +1 hr -> alarm goes off (gets louder and quicker)
        - +2 hrs -> the clock face will become blurry
        - +3 hrs -> the clock face will begin to fade out until it full disappears
        - for every high within a 24hr period, the clock takes that much longer to return to baseline
    - low:
        - +10 min -> the clock face will shake 
        - +20 min -> drift from the center of the UI and rotate slightly
        - +30 min -> min the clock face will begin to fade out until it full disappears
        - severe lows -> shader color effect

## Demo Notes

### High

*start alarm*

- `CLOCK.alarm = true; highAlarm()`
- move mouse to get to pause for 2 sec

*start blur*

- `blurFace()`

*start fade*

- `fadeFace()` 

### Low

*start shake*

- `shakeFace()`

*start drift*

- `driftFace()`

*start severe low*

- `CLOCK.severeLow = true`

### Example Combos

*high*

`CLOCK.alarm = true; highAlarm(); blurFace()`

*low*

`CLOCK.severeLow = true; shakeFace()`
