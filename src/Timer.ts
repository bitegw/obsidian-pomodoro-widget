import { setIcon } from 'obsidian';
import { alarm, ticking } from 'src/audio_sources';
import { createBlankImage } from './util';

export default class Timer {
    static readonly NUM_NOTCHES = 16;
    static readonly LONG_NOTCH_MOD = 4;
    static readonly ROTATION_INCREMENT = 180 / this.NUM_NOTCHES;

	// Parameters from plugin settings
	private defaultTimerDuration: number;

    // Variables
    private isTicking = false;
	private tickingEnabled: boolean;
	private timerTimestamp : Date;
	private timerRemainingTime: number;
	private lastSetAmount: number;
	private stopwatchEnabled = false;
	private stopwatchTimestamp: Date;

    // Audio
    private tickingSound: HTMLAudioElement;
	private alarmSound: HTMLAudioElement;

    // HTML Elements that need to be updated.
	private handleCircle: HTMLDivElement;
	private handle: HTMLDivElement;
	private dot: HTMLDivElement;
	private timerTime: HTMLElement;
	private stopwatchTime: HTMLElement;
	private playBtn: HTMLButtonElement;
	private stopwatchBtn: HTMLButtonElement;

    constructor(parentElement: HTMLElement, defaultTimerDuration: number) {
		this.defaultTimerDuration = defaultTimerDuration;
        // Load audio sources
        this.alarmSound = new Audio(alarm);
		this.tickingSound = new Audio(ticking);
		this.tickingSound.loop = true;
		this.tickingSound.playbackRate = 0.5;

        // Construct the timer.
		const handleBox = parentElement.createDiv();
		handleBox.addClass('pomo-timer-handle-box');

		this.handleCircle = handleBox.createDiv();
		this.handleCircle.addClass('pomo-timer-handle-circle');

		this.dot = this.handleCircle.createDiv();
		this.dot.addClass('pomo-timer-dot');
		this.dot.draggable = true;

		this.handle = this.handleCircle.createDiv();
		this.handle.addClass('pomo-timer-handle');

		const handleCircleInner = this.handleCircle.createDiv();
		handleCircleInner.addClass('pomo-timer-handle-circle-inner');

		for(let i = 0; i < Timer.NUM_NOTCHES; i++) {
			const notch = handleCircleInner.createDiv();
			notch.addClass('pomo-notch');
			notch.style.transform = `rotate(${i * Timer.ROTATION_INCREMENT}deg)`;
			if(i % Timer.LONG_NOTCH_MOD == 0) {
				notch.addClass('pomo-notch-long');
			}
		}

		const blankImage = createBlankImage();

		let handleEvent = (e: DragEvent) => {
			e.dataTransfer!.setDragImage(blankImage, 0, 0);
			const pos = handleBox.getBoundingClientRect();
			const angle = this.angleBetween(pos.x + pos.width / 2, pos.y + pos.height / 2, e.clientX, e.clientY);
			this.setDurationFromAngle(angle);
		}

		this.dot.addEventListener('dragstart', (e: DragEvent) => {
			e.dataTransfer?.setDragImage(blankImage, 0, 0);
			e.dataTransfer!.effectAllowed = 'move';
		});
		this.dot.addEventListener('drag', handleEvent);
		this.dot.addEventListener('dragend', handleEvent);
		this.handleCircle.addEventListener('click', handleEvent);

		const timeLabel = this.handleCircle.createDiv();
		timeLabel.addClass('pomo-time-label');

		this.timerTime = timeLabel.createDiv();
		this.timerTime.innerText = `25:00`;
		this.timerTime.addClass('pomo-time-timer');
		this.stopwatchTime = timeLabel.createDiv();
		this.stopwatchTime.innerText = '00:00:00';
		this.stopwatchTime.addClass('pomo-time-stopwatch');
		
		const controls = parentElement.createDiv();
		controls.addClass('pomo-timer-controls');

		this.playBtn = controls.createEl('button');
		this.playBtn.addClass('pomo-button');
        setIcon(this.playBtn, 'play');
		this.playBtn.addEventListener('click', ()=>{
			this.toggleTimer();
		});

		this.stopwatchBtn = controls.createEl('button');
		this.stopwatchBtn.addClass('pomo-button');
        setIcon(this.stopwatchBtn, 'timer');
		this.stopwatchBtn.addEventListener('click', ()=>{
			this.toggleStopwatch();
		});
		
		const durationBtn = controls.createEl('button');
		durationBtn.addClass('pomo-button');
		durationBtn.addEventListener('click', () => {
			const duration = Math.clamp(parseInt(durationInput.value) / 60, 0, 1);
			this.setDurationFromValue(duration);
		});
		durationBtn.innerText = 'SET';
		
		const durationInput = controls.createEl('input');
		durationInput.addClass('pomo-input');
		durationInput.type = 'number';
		durationInput.step = '1';
		durationInput.min= '1';
		durationInput.max= '60';
		durationInput.value = `${this.defaultTimerDuration}`;

		this.resetTimer();
    }

    private timerProcess: any;

	toggleTimer () {
		if(this.isTicking) {
			this.stopTimer();
		} else {
			this.startTimer();
		}
	}

    stopTimer() {
        clearInterval(this.timerProcess);
        this.isTicking = false;
        this.tickingSound.pause();
        this.tickingSound.currentTime = 0;
        setIcon(this.playBtn, 'play');
    }

    startTimer() {
        this.timerTimestamp = new Date(new Date().getTime() + new Date(this.timerRemainingTime).getTime());
        if(this.tickingEnabled) {
			this.tickingSound.play();
		}
        this.isTicking = true;
        setIcon(this.playBtn, 'pause');
        this.timerProcess = setInterval((label: HTMLElement = this.timerTime) => {
            this.timerRemainingTime = this.timerTimestamp.getTime() - new Date().getTime();

            if(this.timerRemainingTime <= 0) {
                // Ring alarm!
                this.alarmSound.play();
                this.resetTimer();
                return;
            }

            label.innerText = this.getTimeString(this.timerRemainingTime);

            // Update dot position
            const angle = Math.round(this.timerRemainingTime / 10000);
            const angleRad = (1 - angle / 360) * Math.PI * 2 - Math.PI / 2;
            const xOffset = (50 + Math.sin(angleRad) * 50) + '%';
            const yOffset = (50 + Math.cos(angleRad) * 50) + '%';
            this.dot.style.left = xOffset;
            this.dot.style.top = yOffset;
            this.setTimerGradient(angle);
        }, 100); // Timer update interval
    }

    resetTimer() {
        this.setDurationFromValue(this.defaultTimerDuration / 60);
    }

	private stopwatchProcess: any;

	toggleStopwatch () {
		if(this.stopwatchEnabled) {
			this.stopStopwatch();
		} else {
			this.startStopwatch();
		}
	}

    startStopwatch() {
        this.stopwatchTimestamp = new Date();
        this.stopwatchProcess = setInterval((label: HTMLElement = this.stopwatchTime) => {
            const elapsedTime = (new Date()).getTime() - this.stopwatchTimestamp.getTime();

            if(elapsedTime >= 6000000) {
                this.stopStopwatch();
                return;
            }

            label.innerText = this.getTimeMsString(elapsedTime);
        }, 1); // Stopwatch update interval

        setIcon(this.stopwatchBtn, 'timer-off');
        this.stopwatchEnabled = true;
    }

    stopStopwatch() {
        clearInterval(this.stopwatchProcess);
        setIcon(this.stopwatchBtn, 'timer');
        this.stopwatchEnabled = false;
    }

	// Helper functions

	getTimeString(time: number) {
		const minutes = Math.floor((time / 1000) / 60);
		const seconds = Math.floor((time / 1000) - minutes * 60);
		return `${(minutes.toString().padStart(2, '0'))}:${seconds.toString().padStart(2, '0')}`;
	}

    getTimeMsString(time: number) {
		const minutes = Math.floor((time / 1000) / 60);
		const seconds = Math.floor((time / 1000) - minutes * 60);
        const millis = Math.floor(time % 1000 / 10);
		return `${(minutes.toString().padStart(2, '0'))}:${seconds.toString().padStart(2, '0')}:${millis.toString().padStart(2, '0')}`;
	}

	angleBetween(x1: number, y1: number, x2: number, y2: number) : number {
		return (-Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2);
	}

	setDurationFromValue(duration: number) {
        const angle = this.durationToAngle(duration);
		this.setDuration(duration, angle);
	}

	setDurationFromAngle(angle: number) {
        const duration = this.angleToDuration(angle);
        this.setDuration(duration, angle);
	}

    setDuration(duration: number, angle: number) {
        this.stopTimer();

		// Update handle position and label
		const xOffset = (50 + Math.sin(angle) * 50) + '%';
		const yOffset = (50 + Math.cos(angle) * 50) + '%';
		this.handle.style.left = xOffset;
		this.handle.style.top = yOffset;
		this.dot.style.left = xOffset;
		this.dot.style.top = yOffset;

		this.lastSetAmount = duration * 3600000;
		const maxAngle = Math.round(duration * 360);
		this.timerTime.innerText = this.getTimeString(this.lastSetAmount);
		this.setTimerGradient(maxAngle);

		this.timerRemainingTime = this.lastSetAmount;
    }

    durationToAngle(duration: number): number {
        return (1 - duration) * Math.PI * 2 - Math.PI / 2;
    }

    angleToDuration(angle: number): number {
        return (1 - (angle + Math.PI / 2) / (Math.PI * 2));
    }

	setTimerGradient(angle: number) {
		this.handleCircle.style.backgroundImage = `conic-gradient(from 270deg, transparent, var(--interactive-accent) ${angle}deg, transparent ${angle + 1}deg)`;
	}

    public onunload() {
        clearInterval(this.timerProcess);
        clearInterval(this.stopwatchProcess);
        this.tickingSound.pause();
        this.alarmSound.pause();
        this.tickingSound.remove();
        this.alarmSound.remove();
    }

	public updateSettings(options: {defaultTimerDuration?: number, tickingSpeed?: number, tickingVolume?: number, alarmVolume?: number, tickingEnabled?: boolean}) {
		if(options.defaultTimerDuration !== undefined)
			this.defaultTimerDuration = options.defaultTimerDuration;
		if(options.tickingSpeed !== undefined)
			this.tickingSound.playbackRate = options.tickingSpeed * 0.5;
		if(options.tickingVolume !== undefined)
			this.tickingSound.volume = options.tickingVolume;
		if(options.alarmVolume !== undefined)
			this.alarmSound.volume = options.alarmVolume;
		if(options.tickingEnabled !== undefined) {
			this.tickingEnabled = options.tickingEnabled;
			if(!options.tickingEnabled) {
				this.tickingSound.pause();
			} else if(this.isTicking) {
					this.tickingSound.play();
			}
		}
	}
}