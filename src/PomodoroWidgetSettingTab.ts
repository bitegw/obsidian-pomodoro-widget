import PomodoroWidgetPlugin, { DEFAULT_SETTINGS, TimerToggleLocation } from '../main';
import { App, PluginSettingTab, Setting } from 'obsidian';
import { Corner } from './Widget';

export class PomodoroWidgetSettingTab extends PluginSettingTab {
  plugin: PomodoroWidgetPlugin;

  constructor(app: App, plugin: PomodoroWidgetPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
        .setName('Default timer time')
        .setDesc('The initial value of the timer, and the value the timer resets to after ringing.')
        .addDropdown(dd => {
            dd
                .addOption('5','5')
                .addOption('10','10')
                .addOption('15','15')
                .addOption('20','20')
                .addOption('25','25')
                .addOption('30','30')
                .addOption('35','35')
                .addOption('40','40')
                .addOption('45','45')
                .addOption('50','50')
                .addOption('55','55')
                .addOption('60','60')
                .setValue(`${this.plugin.settings.defaultTimerDuration}`)
                .onChange(async (value) => {
                    this.plugin.settings.defaultTimerDuration = parseInt(value);
                    await this.plugin.saveSettings();
                })
        });

    new Setting(containerEl)
    .setName('Ticking enabled')
    .addToggle(cb => {
        cb
            .setValue(this.plugin.settings.tickingEnabled)
            .onChange(async (value) => {
            this.plugin.settings.tickingEnabled = value;
            await this.plugin.saveSettings();
        })
    });

    new Setting(containerEl)
        .setName('Ticking volume')
        .addSlider(slider => {
            slider
                .setLimits(0, 1, 0.001)
                .setValue(this.plugin.settings.tickingVolume)
                .onChange(async (value) => {
                    this.plugin.settings.tickingVolume = value;
                    await this.plugin.saveSettings();
                })
        });

    new Setting(containerEl)
        .setName('Ticking speed')
        .addDropdown(dd => {
            dd
                .addOption('1','1')
                .addOption('2','2')
                .addOption('4','4')
                .setValue(`${this.plugin.settings.tickingSpeed}`)
                .onChange(async (value) => {
                    this.plugin.settings.tickingSpeed = parseFloat(value);
                    await this.plugin.saveSettings();
                })
        });

    new Setting(containerEl)
        .setName('Alarm volume')
        .addSlider(slider => {
            slider
                .setLimits(0, 1, 0.001)
                .setValue(this.plugin.settings.alarmVolume)
                .onChange(async (value) => {
                    this.plugin.settings.alarmVolume = value;
                    await this.plugin.saveSettings();
                })
        });

    new Setting(containerEl)
        .setName('Widget toggle location')
        .addDropdown(dd => {
            dd
                .addOption(TimerToggleLocation.CommandOnly, TimerToggleLocation.CommandOnly)
                .addOption(TimerToggleLocation.RibbonIcon, TimerToggleLocation.RibbonIcon)
                .addOption(TimerToggleLocation.StatusBarItem, TimerToggleLocation.StatusBarItem)
                .setValue(this.plugin.settings.timerToggleLocation)
                .onChange(async (value) => {
                    this.plugin.settings.timerToggleLocation = <TimerToggleLocation>(value as keyof typeof TimerToggleLocation);
                    this.plugin.updateToggleLocation();
                    await this.plugin.saveSettings();
                })
        });

    new Setting(containerEl)
        .setName('Reset widget position and anchor')
        .addButton(button => {
            button
                .setButtonText('Reset widget')
                .onClick(async () => {
                    this.plugin.settings.widgetAnchor = DEFAULT_SETTINGS.widgetAnchor!;
                    this.plugin.settings.widgetXOffset = DEFAULT_SETTINGS.widgetXOffset!;
                    this.plugin.settings.widgetYOffset = DEFAULT_SETTINGS.widgetYOffset!;
                    await this.plugin.saveSettings();
                    this.plugin.loadWidgetSettings();
                })
        });
    }
}