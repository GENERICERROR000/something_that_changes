/*
	what:	something_that_changes
	who:	noah kernis
	when:	2020

	==========

	digital clock source
		https://editor.p5js.org/D_Snyder/sketches/Xtx2Zu9D5

	green sock cheat sheet
		https://ihatetomatoes.net/wp-content/uploads/2016/07/GreenSock-Cheatsheet-4.pdf
*/

// baseline settings for trends
const HIGH = 200
const LOW = 69
const SEVERE_LOW = 50
const ALARM = 1000 * 60 * 60
const BLUR = 1000 * 60 * 60 * 2
const FADE = 1000 * 60 * 60 * 2
const SHAKE = 1000 * 60 * 10
const DRIFT = 1000 * 60 * 20

// baseline settings for clock
const CLOCK_X_NORMAL = 0 // -windowWidth/2 - windowWidth/2
const CLOCK_Y_NORMAL = 0 // -windowHeight/2 - windowHeight/2
const CLOCK_ALPHA_NORMAL = 255 // 225 - 0 (opaque - transparent)	
// const CLOCK_ROTATION_NORMAL = 0 // (-1 - 1) (rotate 360 left - rotate 360 right)
const CLOCK_BLUR_NORMAL = 7.0 // 7.0 - 0.2 (none - full blur)
const CLOCK_SHAKE_NORMAL = 0 // TODO: need to implement
const CLOCK_ALARM_AMPLITUDE_NORMAL = 0.01 // 0.01 - 0.7 (quiet - loud) 
const CLOCK_ALARM_SPEED_NORMAL = 25 // 25 - 1 (slow - fast)
const CLOCK_HEAL_RATE_NORMAL = 60 * 30 // TODO: need to implement

var CLOCK
var CLOCK_BLUR
var CLOCK_X
var CLOCK_Y
// var CLOCK_ROTATION
var CLOCK_ALPHA
var ALARM_AMPLITUDE
var ALARM_SPEED

var clockFont
var blurShader
var noiseShader
var timeHolderCanvas
var timeCanvas
var noiseHolderCanvas

// clock parameters
const clockFace = {
	x: CLOCK_X_NORMAL,
	y: CLOCK_Y_NORMAL,
	alpha: CLOCK_ALPHA_NORMAL,
	// rotation: CLOCK_ROTATION_NORMAL,
	blur: CLOCK_BLUR_NORMAL,
	alarmAmplitude: CLOCK_ALARM_AMPLITUDE_NORMAL,
	alarmSpeed: CLOCK_ALARM_SPEED_NORMAL,
	shake: CLOCK_SHAKE_NORMAL,
	healRate: CLOCK_HEAL_RATE_NORMAL
}

// ========== Internal Clock ==========

class InternalClock {
	constructor() {
		// clock states
		this.clock = 0
		this.low = false
		this.high = false
		this.alarm = false
		this.alarmStarted = false
		this.alarmMuted = false
		this.blur = false
		this.fade = false
		this.shake = false
		this.drift = false
		this.severeLow = false

		// clock timelines
		this.alarmTL = {}
		this.blurTL = {}
		this.fadeTL = {}
		this.shakeTL = {}
		this.driftL = {}

		// oscillator
		this.osc = new p5.Oscillator()
		this.osc.setType('triangle')
		this.osc.freq(220)

		// data to calc avg from
		this.dataOnboard = []
	}

	newData(data) {
		if (this.dataOnboard.length > 15) this.dataOnboard.pop()
		this.dataOnboard.unshift(data)
	}

	startTrend(trend) {
		this.clock = millis()

		switch (trend) {
			case "high":
				this.high = true
				break
			case "low":
				this.low = true
				break
			default:
				break
		}

		return true
	}

	endTrend() {
		this.clock = 0
		this.low = false
		this.high = false
		this.alarm = false
		this.blur = false
		this.fade = false
		this.shake = false
		this.drift = false
	}

	checkClock() {
		return millis() - this.clock
	}

	checkTrends() {
		let sum
		this.dataOnboard.forEach(data => sum += data)

		let avg = sum / this.dataOnboard.length

		if (!this.high || !this.low) {
			if (avg >= HIGH) return this.startTrend("high")
			if (this.dataOnboard[0] <= SEVERE_LOW) this.severeLow = true
			if (avg <= LOW) return this.startTrend("low")
		}

		if (this.high || this.low) {
			if (avg < HIGH) this.endTrend()
			if (avg > LOW) this.endTrend()
		}

		return false
	}

	checkHigh() {
		return this.high
	}

	checkLow() {
		return this.low
	}

	checkAlarm() {
		if (millis() - this.clock > ALARM) {
			this.alarm = true
			return true
		}
		return false
	}

	checkBlur() {
		if (millis() - this.clock > BLUR) {
			this.blur = true
			return true
		}
		return false
	}

	checkFade() {
		if (millis() - this.clock > FADE) {
			this.fade = true
			return true
		}
		return false
	}

	checkShake() {
		if (millis() - this.clock > SHAKE) {
			this.shake = true
			return true
		}
		return false
	}

	checkDrift() {
		if (millis() - this.clock > DRIFT) {
			this.drift = true
			return true
		}
		return false
	}

	checkSevereLow() {
		if (this.dataOnboard[0] <= SEVERE_LOW) {
			this.severeLow = true
			return true
		}
		return false
	}

	checkLow() {
		if (this.dataOnboard[0] > SEVERE_LOW) {
			this.severeLow = false
		}
	}
}

// ========== P5.JS ==========

function preload() {
	// load shaders

	// source: https://github.com/aferriss/p5jsShaderExamples/blob/gh-pages/4_image-effects/4-9_single-pass-blur/effect.frag
	blurShader = loadShader('assets/shaders/blur/blur.vert', 'assets/shaders/blur/blur.frag')

	// source: https://glitch.com/~recursive-noise-experiment
	noiseShader = loadShader('assets/shaders/noise/noise.vert', 'assets/shaders/noise/noise.frag')

	// load font
	clockFont = loadFont("assets/fonts/digital_7_mono.ttf")
}

function setup() {
	// main canvas
	createCanvas(windowWidth, windowHeight)

	// context to use for loading blur shader
	timeHolderCanvas = createGraphics(windowWidth, windowHeight, WEBGL)

	// context (image) to be passed to blur shader
	timeCanvas = createGraphics(windowWidth, windowHeight, WEBGL)

	// context to use for loading noise shader
	noiseHolderCanvas = createGraphics(windowWidth, windowHeight, WEBGL)

	// fix for shader rendering flipped across y axis
	timeCanvas.scale(-1, 1)

	// disables scaling for retina screens which can create inconsistent scaling between displays
	pixelDensity(1)

	noiseHolderCanvas.pixelDensity(1)
	noiseHolderCanvas.noStroke()

	// create a new clock
	CLOCK = new InternalClock()
}

function draw() {
	// background of main canvas should be black
	background(0)

	// check trends
	trends()

	// render clock face
	display()

	if (CLOCK.alarm) {
		highAlarm()
	}
}

// ========== Trends ==========

function trends() {
	CLOCK.checkTrends()

	if (CLOCK.high) {
		if (!CLOCK.alarm) this.checkAlarm() ? "do()" : "" // highAlarm()
		if (!CLOCK.blur) this.checkBlur() ? "do()" : "" // blurFace()
		if (!CLOCK.fade) this.checkDade() ? "do()" : "" // fadeFace()
	}

	if (CLOCK.low) {
		if (!CLOCK.shake) this.checkShake() ? "do()" : "" // shakeFace()
		if (!CLOCK.drift) this.checkDrift() ? "do()" : "" // driftFace()
		if (!CLOCK.severeLow) this.checkSevereLow()
		if (CLOCK.severeLow) CLOCK.checkLow()
	}
}

// ========== Display ==========

function display() {
	CLOCK_ROTATION = clockFace.rotation
	CLOCK_ALPHA = Math.floor(clockFace.alpha)
	CLOCK_X = clockFace.x
	CLOCK_Y = clockFace.y

	renderBlurShader()

	if (CLOCK.severeLow) {
		severeLow()

		// settings for clock background
		noiseHolderCanvas.rect(0, 0, width, height)

		// // render noiseHolderCanvas to main canvas
		image(noiseHolderCanvas, 0, 0, windowWidth, windowHeight)
	}

	// settings for clock face
	timeCanvas.background('rgba(0, 0, 0, 0)')
	timeCanvas.textFont(clockFont)
	timeCanvas.textAlign(CENTER, CENTER)
	timeCanvas.textSize(width / 6)

	// text alpha 
	timeCanvas.fill(255, 255, 255, CLOCK_ALPHA)

	// text rotation
	// timeCanvas.push()
	// timeCanvas.rotate(CLOCK_ROTATION)

	// check time
	let time = getTime()

	// write text to timeCanvas
	timeCanvas.text(time, CLOCK_X, CLOCK_Y)
	// timeCanvas.pop()

	// create geometry for text to render on
	timeHolderCanvas.rect(0, 0, windowWidth, windowHeight)

	// render timeHolderCanvas to main canvas
	image(timeHolderCanvas, 0, 0, windowWidth, windowHeight)
}

function getTime() {
	let hr = hour()
	let min = minute()
	let secs = second()

	if (secs < 10) secs = "0" + secs
	if (min < 10) min = "0" + min
	if (hr < 10) hr = "0" + hr

	return hr + ":" + min + ":" + secs
}

function renderBlurShader() {
	CLOCK_BLUR = clockFace.blur

	// load shader to timeHolderCanvas
	timeHolderCanvas.shader(blurShader)

	// pass text canvas as image to shader
	// (will be rendered on timeHolderCanvas)
	blurShader.setUniform("tex0", timeCanvas)
	blurShader.setUniform('texelSize', [(1.0 / width) / CLOCK_BLUR, (1.0 / height) / CLOCK_BLUR])
}

// ========== Effects ==========

function severeLow() {
	// load shader to timeHolderCanvas
	noiseHolderCanvas.shader(noiseShader)

	// pass text canvas as image to shader
	// (will be rendered on timeHolderCanvas)
	noiseShader.setUniform("iResolution", [width, height])
	noiseShader.setUniform("iFrame", frameCount)
}

function highAlarm() {
	// source: https://creative-coding.decontextualize.com/synthesizing-analyzing-sound/
	// tweaks have been made.
	ALARM_AMPLITUDE = clockFace.alarmAmplitude
	ALARM_SPEED = Math.floor(clockFace.alarmSpeed)

	if (!CLOCK.alarmStarted) {
		CLOCK.osc.start()

		CLOCK.alarmTL = new TweenLite.fromTo(clockFace, {
			alarmAmplitude: CLOCK_ALARM_AMPLITUDE_NORMAL,
			alarmSpeed: CLOCK_ALARM_SPEED_NORMAL,
		}, {
			alarmAmplitude: 0.7,
			alarmSpeed: 1,
			// duration: 60 * 60
			duration: 60 // NOTE: for demo
		})

		CLOCK.alarm = true
		CLOCK.alarmStarted = true
	}

	if (!CLOCK.alarmMuted) {
		// console.log("hit");
		CLOCK.osc.amp(ALARM_AMPLITUDE)

		if (frameCount % ALARM_SPEED == 0) {
			CLOCK.osc.freq(midiToFreq(int(random(31, 80))))
		}
	}
}

function mouseMoved() {
	if (CLOCK && CLOCK.alarm && !CLOCK.alarmMuted) {
		pauseAlarm()
	}
}

function pauseAlarm() {
	CLOCK.osc.stop()

	setTimeout(() => {
		CLOCK.osc.alarmMuted = false
		CLOCK.osc.start()
		// }, 1000 * 60 * 20)
	}, 2000) // NOTE: for demo
}

function blurFace() {
	CLOCK.blurTL = new TweenLite.to(clockFace, {
		blur: 0.2,
		// duration: 60 * 60 
		duration: 30 // NOTE: for demo
	})
}

// WARN: TODO: shake and drift both effect `x` - so currently canceling each other out
// - one needs to ref x, and the other needs to apply some change to that value

function shakeFace() {
	// source: https://greensock.com/forums/topic/10721-shake-animation/?do=findComment&comment=42778
	CLOCK.shakeTL = new TweenLite.to(clockFace, {
		x: "+=10",
		yoyo: true,
		repeat: -1,
		duration: 0.1
	})
}

function driftFace() {
	let winW = windowWidth / 2
	let winH = windowHeight / 2
	let newX = getRandInt(-winW, winW)
	let newY = getRandInt(-winH, winH)

	CLOCK.driftTL = new TweenLite.fromTo(clockFace, {
		x: 0,
		y: 0,
	}, {
		x: newX,
		y: newY,
		// duration: 60 * 60
		duration: 60 // NOTE: for demo
	})
}

function fadeFace() {
	CLOCK.fadeTL = new TweenLite.to(clockFace, {
		alpha: 0,
		// duration: 60 * 60
		duration: 60 // NOTE: for demo
	})
}

// function healRate() {

// }

// ========== Helpers ==========

function windowResized() {
	resizeCanvas(windowWidth, windowHeight)
}

// source: https://www.w3schools.com/js/js_random.asp
function getRandInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}