/*
	Type 1 Time - 2020
	by noah kernis

	==========

	digital clock source
		https://editor.p5js.org/D_Snyder/sketches/Xtx2Zu9D5

	data generator
		https://github.com/openmhealth/sample-data-generator
*/

/*
	TODO:
		- get data from "API" -> https://github.com/openmhealth/sample-data-generator
		- as data changes over time, do action (direction change dependent)
		
		~1) install greensock~
		2) create effects
			- all effects need:
				a) when to start
				b) check if running
				c) stop current run
				d) return to "normal"
		3) generate data 
		4) create api 

		* move shaders to strings so file is self contained

	effects:
		- high:
			- +1 hr -> alarm goes off (gets louder and quicker)
			- +3 hrs -> the clock face will become blurry
			- +5 hrs -> the clock face will begin to fade out until it full disappears
			- for every high within a 24hr period, the clock takes that much longer to return to baseline
		- low:
			- +10 min -> the clock face will shake, 
				-> shaking increases over time
			- +20 min -> drift from the center of the UI and rotate slightly
			- +30 min -> the clock face may blur a bit
			- +40 -> min the clock face will begin to fade out until it full disappears
			- severe lows -> shader color effect
*/

// baseline settings for clock
const CLOCK_X_NORMAL = 0 // -windowWidth - windowWidth  
const CLOCK_Y_NORMAL = 0 // -windowHeight - windowHeight
const CLOCK_ALPHA_NORMAL = 255 // 225 - 0 (opaque - transparent)	
const CLOCK_ROTATION_NORMAL = 0 // (-1 - 1) (rotate 360 left - rotate 360 right)
const CLOCK_BLUR_NORMAL = 7.0 // 7.0 - 0.2 (none - full blur)
const CLOCK_SHAKE_NORMAL = 0 // TODO: need to implement
const CLOCK_ALARM_AMPLITUDE_NORMAL = 0.1 // 0.1 - 0.9 (quiet - loud) 
const CLOCK_ALARM_SPEED_NORMAL = 25 // 25 - 1 (slow - fast)
const CLOCK_HEAL_RATE_NORMAL = 60 * 30 // TODO: need to implement

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

let cat = 50
let runit = false

function draw() {
	// background of main canvas should be black
	background(0)

	severeLow()

	blurFace()

	// render clock face
	clock()

	// TODO: move draw cycle - needs to check if in process, etc

	// TODO: move draw cycle - needs to check if in process, etc
	// highAlarm()

	// TODO: move draw cycle - needs to check if in process, etc

	if (cat < 100 && runit) {
		cat++
		console.log(clockFace)
		console.log(CLOCK_ALPHA)
	}

	// colorMode(HSB)
	// fill(myCircle.h, 255, 255, myCircle.a);
	// ellipse(myCircle.x, myCircle.y, myCircle.r, myCircle.r)
	// ellipse(width / 2, height / 2, myCircle.r, myCircle.r).filter(BLUR, 6)
}

// ========== Clock ==========

function clock() {
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

var osc
var started = false

function highAlarm() {
	// source: https://creative-coding.decontextualize.com/synthesizing-analyzing-sound/
	// tweaks have beeb made.

	ALARM_AMPLITUDE = clockFace.alarmAmplitude
	ALARM_SPEED = clockFace.alarmSpeed

	if (!started) {
		osc = new p5.Oscillator()
		osc.setType('triangle')
		osc.freq(220)
		osc.start()
		started = true
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

// ========== Jeff Stuff ==========

// add animation events to the timeline
// see https://greensock.com/docs/v3/GSAP/Timeline

// Something to play with:
// const myCircle = {
// 	x: 50, // position
// 	y: 50,
// 	r: 100, // radius
// 	h: 0, // hue
// 	a: 1 // alpha
// }

// An empty timeline, to hold events defined in setup
// const tl = gsap.timeline({
// 	repeat: -1,
// 	repeatDelay: 0.5,
// 	yoyo: true,
// 	onStart: myStartFunction,
// 	onRepeat: myRepeatFunction,
// 	defaults: {
// 		ease: "power1.inOut"
// 	}
// })

// call a function and pass some variables
// tl.call(myCallBack, ["One", 2])

//You can attach functions to timeline events, or call them at any time.
//These are not exciting, but you can bring the sizzle!

// function myStartFunction() {
// 	print("Start!");
// }

// function myRepeatFunction() {
// 	print("Repeating!")
// }

// function myCallBack(a, b) {
// 	// print("Callback " + a + ", " + b)

// 	gsap.to(myCircle, {
// 		h: '+=33',
// 		ease: "back.inOut(1.7)",
// 		duration: 1
// 	});
// }