import { Plugin, setIcon } from 'obsidian';
import Widget, { Corner } from 'src/Widget';
import Timer from 'src/Timer';
import { PomodoroWidgetSettingTab } from 'src/PomodoroWidgetSettingTab';

export enum TimerToggleLocation {
	CommandOnly = 'Command only',
	RibbonIcon = 'Ribbon icon',
	StatusBarItem = 'Status bar item',
}

export interface PomodoroWidgetPluginSettings {
	defaultTimerDuration: number,
	tickingSpeed: number,
	tickingVolume: number,
	alarmVolume: number,
	timerToggleLocation: TimerToggleLocation,
	// Widget settings
	widgetVisible: boolean,
	widgetAnchor: Corner,
	widgetXOffset: number,
	widgetYOffset: number,
}

export const DEFAULT_SETTINGS: Partial<PomodoroWidgetPluginSettings> = {
	defaultTimerDuration: 25,
	tickingSpeed: 1,
	tickingVolume: 1,
	alarmVolume: 1,
	timerToggleLocation: TimerToggleLocation.RibbonIcon,
	widgetVisible: true,
	widgetAnchor: Corner.BottomRight,
	widgetXOffset: 20,
	widgetYOffset: 40,
};

export default class PomodoroWidgetPlugin extends Plugin {
	public settings: PomodoroWidgetPluginSettings;
    public widget: Widget;
    private timer: Timer;

	// TODO:
	// Add option to drag around and anchor the widget to the corners
	// Add option for where to show the timer toggle (command only, ribbon icon, status bar)

    async onload() {
		this.addSettingTab(new PomodoroWidgetSettingTab(this.app, this));
		await this.loadSettings();

		this.widget = new Widget(this.app, this.settings.widgetVisible, { 
			onClose: () => { this.timer.stopTimer() },
			onDrag: (nearestCorner, xOffset, yOffset) => {
				this.settings.widgetAnchor = nearestCorner;
				this.settings.widgetXOffset = xOffset;
				this.settings.widgetYOffset = yOffset;
				this.saveSettings();
			},	
			onToggle: (isVisible: boolean) => {
				this.settings.widgetVisible = isVisible;
				this.saveSettings();
			},
		});
		this.timer = new Timer(this.widget.widgetElement, this.settings.defaultTimerDuration);

		// Load previous settings 
		this.loadWidgetSettings();
		this.loadTimerSettings();

		// Always add the command
		this.addCommand({
			id: "toggle-pomodoro-widget",
			name: "Toggle timer / stopwatch",
			callback: () => {
					this.widget.toggle();
			},
		});

		this.app.workspace.onLayoutReady(() => {
			setTimeout(()=>{
				this.updateToggleLocation();
			});
		});
    }

	private ribbonIcon: HTMLElement;
	private statusBarItem: HTMLElement;

	updateToggleLocation() {
		// Clear old elements
		if(this.ribbonIcon) {
			this.ribbonIcon.remove();
		}
		if(this.statusBarItem) {
			this.statusBarItem.remove();
		}

		console.log(this.settings.timerToggleLocation);
		if(this.settings.timerToggleLocation == TimerToggleLocation.CommandOnly) {
			return;
		} else if (this.settings.timerToggleLocation == TimerToggleLocation.RibbonIcon) {
			this.ribbonIcon = this.addRibbonIcon('alarm-clock', 'Toggle pomodoro widget.', () => {
				this.widget.toggle();
			});
		} else {
			this.statusBarItem = this.addStatusBarItem().createEl('button');
			setIcon(this.statusBarItem, 'alarm-clock');
			this.statusBarItem.addEventListener('click', () => {
				this.widget.toggle();
			});
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.loadTimerSettings();
	}

	loadWidgetSettings() {
		this.widget.updateSettings({
			widgetVisible: this.settings.widgetVisible,
			widgetAnchor: this.settings.widgetAnchor,
			widgetXOffset: this.settings.widgetXOffset,
			widgetYOffset: this.settings.widgetYOffset,
		});
	}

	loadTimerSettings() {
		this.timer.updateSettings({
			defaultTimerDuration: this.settings.defaultTimerDuration, 
			tickingSpeed: this.settings.tickingSpeed,
			tickingVolume: this.settings.tickingVolume,
			alarmVolume: this.settings.alarmVolume,
		});
	}

    async onunload() {
		this.timer.onunload();
		this.app.workspace.containerEl.removeChild(this.widget.widgetElement);
	}
}