/*
	what:	something_that_changes
	who:	noah kernis
	when:	2020

	==========

	digital clock source
		https://editor.p5js.org/D_Snyder/sketches/Xtx2Zu9D5

	data generator source
		https://github.com/openmhealth/sample-data-generator
*/

// baseline settings for trends
const HIGH = 200
const LOW = 69
const SEVERE_LOW = 50
const ALARM = 60 * 60
const BLUR = 2 * 60 * 60
const HIGH_FADE = 2 * 60 * 60
const SHAKE = 10 * 60
const DRIFT = 20 * 60
const LOW_FADE = 30 * 60

// baseline settings for clock
const CLOCK_X_NORMAL = 0 // -windowWidth/2 - windowWidth/2
const CLOCK_Y_NORMAL = 0 // -windowHeight/2 - windowHeight/2
const CLOCK_ALPHA_NORMAL = 255 // 225 - 0 (opaque - transparent)	
const CLOCK_ROTATION_NORMAL = 0 // (-1 - 1) (rotate 360 left - rotate 360 right)
const CLOCK_BLUR_NORMAL = 7.0 // 7.0 - 0.2 (none - full blur)
const CLOCK_SHAKE_NORMAL = 0 // TODO: need to implement
const CLOCK_ALARM_AMPLITUDE_NORMAL = 0.1 // 0.1 - 0.9 (quiet - loud) 
const CLOCK_ALARM_SPEED_NORMAL = 25 // 25 - 1 (slow - fast)
const CLOCK_HEAL_RATE_NORMAL = 60 * 30 // TODO: need to implement

var CLOCK
var CLOCK_BLUR
var CLOCK_X
var CLOCK_Y
var CLOCK_ROTATION
var CLOCK_ALPHA
var ALARM_AMPLITUDE
var ALARM_SPEED

var clockFont
var blurShader
var noiseShader
var timeHolderCanvas
var timeCanvas
var noiseHolderCanvas

var alarmsStarted = false

// clock parameters
const clockFace = {
	x: CLOCK_X_NORMAL,
	y: CLOCK_Y_NORMAL,
	alpha: CLOCK_ALPHA_NORMAL,
	rotation: CLOCK_ROTATION_NORMAL,
	blur: CLOCK_BLUR_NORMAL,
	alarmAmplitude: CLOCK_ALARM_AMPLITUDE_NORMAL,
	alarmSpeed: CLOCK_ALARM_SPEED_NORMAL,
	shake: CLOCK_SHAKE_NORMAL,
	healRate: CLOCK_HEAL_RATE_NORMAL
}

// ========== Internal Clock ==========

class InternalClock {
	constructor() {
		this.clock = 0
		this.low = false
		this.high = false
		this.alarm = false
		this.blur = false
		this.highFade = false
		this.lowFade = false
		this.shake = false
		this.drift = false
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
		this.highFade = false
		this.lowFade = false
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
			if (avg <= LOW) return this.startTrend("low")
		}

		if (this.high || this.low) {
			if (avg < HIGH) this.endTrend()
			if (avg > LOW) this.endTrend()
		}

		return false
	}

	getHigh() {
		return this.high
	}

	getLow() {
		return this.low
	}

	getAlarm() {
		if (millis() - this.clock > ALARM) {
			this.alarm = true
			return true
		}
		return false
	}

	getBlur() {
		if (millis() - this.clock > BLUR) {
			this.blur = true
			return true
		}
		return false
	}

	getHighFade() {
		if (millis() - this.clock > HIGH_FADE) {
			this.highFade = true
			return true
		}
		return false
	}

	getLowFade() {
		if (millis() - this.clock > LOW_FADE) {
			this.lowFade = true
			return true
		}
		return false
	}

	getShake() {
		if (millis() - this.clock > SHAKE) {
			this.shake = true
			return true
		}
		return false
	}

	getDrift() {
		if (millis() - this.clock > DRIFT) {
			this.drift = true
			return true
		}
		return false
	}
}

// ========== P5.JS ==========

// TODO: move this to blur fn - needs to check if in process, etc
// const tl = gsap.timeline({
// 	repeat: 0
// })

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

	// TODO: move this to blur fn - needs to check if in process, etc
	// tl.to(clockFace, {
	// 	blur: 0.2,
	// 	duration: 60 * 24
	// })

	// TODO: move draw cycle - needs to check if in process, etc
	// driftFace()

	// TODO: move draw cycle - needs to check if in process, etc
	// rotateFace()

	// TODO: move draw cycle - needs to check if in process, etc
	// fadeOutFace()

	// TODO: move draw cycle - needs to check if in process, etc
	// shakeFace()
}

function draw() {
	// background of main canvas should be black
	background(0)

	severeLow()

	blurFace()

	trends()

	// render clock face
	display()

	// TODO: move draw cycle - needs to check if in process, etc

	// TODO: move draw cycle - needs to check if in process, etc
	// highAlarm()

	// TODO: move draw cycle - needs to check if in process, etc
}

// ========== Trends ==========

function trends() {
	CLOCK.checkTrends()

	if (CLOCK.high) {
		if (!CLOCK.alarm) return this.getAlarm() ? "do()" : ""
		if (!CLOCK.blur) return this.getBlur() ? "do()" : ""
		if (!CLOCK.highFade) return this.getHighFade() ? "do()" : ""
	}

	if (CLOCK.low) {
		if (!CLOCK.lowFade) return this.getLowFade() ? "do()" : ""
		if (!CLOCK.shake) return this.getShake() ? "do()" : ""
		if (!CLOCK.drift) return this.getDrift() ? "do()" : ""
	}

}

// ========== Display ==========

function display() {
	CLOCK_ROTATION = clockFace.rotation
	CLOCK_ALPHA = Math.floor(clockFace.alpha)
	CLOCK_X = clockFace.x
	CLOCK_Y = clockFace.y

	// TODO: only do if severe high
	// settings for clock background
	// noiseHolderCanvas.rect(0, 0, width, height)

	// // render noiseHolderCanvas to main canvas
	// image(noiseHolderCanvas, 0, 0, windowWidth, windowHeight)

	// settings for clock face
	timeCanvas.background('rgba(0, 0, 0, 0)');
	timeCanvas.textFont(clockFont)
	timeCanvas.textAlign(CENTER, CENTER)
	timeCanvas.textSize(width / 6)

	// text alpha 
	timeCanvas.fill(255, 0, 0, CLOCK_ALPHA)

	// text rotation
	timeCanvas.push()
	timeCanvas.rotate(CLOCK_ROTATION)

	// get time
	let time = getTime()

	// write text to timeCanvas
	timeCanvas.text(time, CLOCK_X, CLOCK_Y)
	timeCanvas.pop()

	// create geometry for text to render on
	timeHolderCanvas.rect(0, 0, windowWidth, windowHeight)

	// render timeHolderCanvas to main canvas
	image(timeHolderCanvas, 0, 0, windowWidth, windowHeight)
}

function getTime() {
	let hr = hour()
	let min = minute()
	let secs = second()

	if (min < 10) min = "0" + min

	return hr + ":" + min + ":" + secs
}

// ========== Effects ==========

// function healRate() {

// }

function severeLow() {
	// TODO: ability tp start and stop
	// load shader to timeHolderCanvas
	noiseHolderCanvas.shader(noiseShader)

	// pass text canvas as image to shader
	// (will be rendered on timeHolderCanvas)
	// noiseShader.setUniform("tex0", timeCanvas)
	noiseShader.setUniform("iResolution", [width, height])
	noiseShader.setUniform("iFrame", frameCount)
	// noiseShader.setUniform("iMouse", [mouseX, map(mouseY, 0, height, height, 0)])
}

function blurFace() {
	CLOCK_BLUR = clockFace.blur

	// TODO: shader stuff needs to happen regardless of blur state
	// load shader to timeHolderCanvas
	timeHolderCanvas.shader(blurShader)

	// pass text canvas as image to shader
	// (will be rendered on timeHolderCanvas)
	blurShader.setUniform("tex0", timeCanvas)
	blurShader.setUniform('texelSize', [(1.0 / width) / CLOCK_BLUR, (1.0 / height) / CLOCK_BLUR])
}

function highAlarm() {
	// source: https://creative-coding.decontextualize.com/synthesizing-analyzing-sound/
	// tweaks have been made.
	ALARM_AMPLITUDE = clockFace.alarmAmplitude
	ALARM_SPEED = clockFace.alarmSpeed
	let osc

	if (!alarmsStarted) {
		osc = new p5.Oscillator()
		osc.setType('triangle')
		osc.freq(220)
		osc.start()
		alarmsStarted = true
	}

	osc.amp(ALARM_AMPLITUDE)

	if (frameCount % ALARM_SPEED == 0) {
		osc.freq(midiToFreq(int(random(31, 80))))
	}
}

function shakeFace() {
	// source: https://greensock.com/forums/topic/10721-shake-animation/?do=findComment&comment=42778
	// TODO: use this method for rotation
	gsap.to(clockFace, 0.1, {
		x: "+=20",
		yoyo: true,
		repeat: -1
	})
	gsap.to(clockFace, 0.1, {
		x: "-=20",
		yoyo: true,
		repeat: -1
	})
}

function rotateFace() {
	// NOTE: TODO: this basiclly works, just needs to be set when know how want to use
	// var tl = new TimelineLite({
	// 		repeat: -1,
	// 		delay: 0.5
	// 	})
	// 	.to(clockFace, 1, {
	// 		rotation: 0.2,
	// 		ease: "power1.out"
	// 	})
	// 	.to(clockFace, 1, {
	// 		rotation: -0.2,
	// 		ease: "power1.out"
	// 	})

	var tl = new TimelineLite({
			repeat: -1,
			delay: 1.5,
			// yoyo: true
		})
		.to(clockFace, 1, {
			rotation: 0.2,
			ease: "power1.out"
		})
		.to(clockFace, 1, {
			rotation: -0.2,
			ease: "power1.inOut"
		})
}

function driftFace() {
	// NOTE: gsap or TimelineLite?
	let winW = windowWidth / 2
	let winH = windowHeight / 2
	let newX = getRandInt(-winW, winW)
	let newY = getRandInt(-winH, winH)

	gsap.fromTo(clockFace, {
		x: 0,
		y: 0,
	}, {
		x: newX,
		y: newY,
		duration: 60
	})
}

function fadeOutFace() {
	var tl = new TimelineLite({
			repeat: 0
		})
		.to(clockFace, 60, {
			alpha: 0,
		})
}

// ========== Helpers ==========

function windowResized() {
	resizeCanvas(windowWidth, windowHeight)
}

// source: https://www.w3schools.com/js/js_random.asp
function getRandInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min
}