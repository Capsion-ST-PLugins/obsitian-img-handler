/*
 * @Author: cpasion-office-win10 373704015@qq.com
 * @Date: 2023-10-12 15:02:02
 * @LastEditors: CPS holy.dandelion@139.com
 * @LastEditTime: 2023-11-09 23:08:26
 * @FilePath: \obsidian-plugin-ts\src\main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { App, Plugin, PluginSettingTab, Setting, Editor } from "obsidian";
import { MarkdownView } from "obsidian";
import { isImage, isPastedImage, parseObsidianUriToPath } from "./utils";
import { TFile, Notice } from "obsidian";

import { promisify } from "util";
import { exec } from "child_process";
const execAsync = promisify(exec);

export const DEBUG = !(process.env.BUILD_ENV === "production");

export function debugLog(...args: any[]) {
	if (!DEBUG) return;

	console.log(new Date().toISOString().slice(11, 23), ...args);
}

/**
 * @description: 定义插件的配置
 */
const PLUGIN_SETTINGS = {
	imageNamePattern: "{{fileName}}",
	dupNumberAtStart: false,
	dupNumberDelimiter: "-",
	autoRename: true,
	autoMove: true,
	pngToJpeg: true,
	quality: "0.6",
	dirpath: "image/",
	test: false,
};

type PluginSettings = typeof PLUGIN_SETTINGS;

export default class MyPlugin extends Plugin {
	settings: PluginSettings;

	async onload() {
		debugLog("cps plugins onload");

		await this.loadSettings();

		this.registerEvent(this.app.vault.on("create", this.main));

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	main = async (file: TFile) => {
		debugLog("触发 this.app.vault.on - create");

		if (!(file instanceof TFile)) return;
		const timeGapMs = Date.now() - file.stat.ctime;

		// if the pasted image is created more than 1 second ago, ignore it
		if (timeGapMs > 1000) return;

		// 当前粘贴下来的不是图片文件
		if (!isImage(file) || !isPastedImage(file)) return;

		debugLog("发现图片文件被创建", file);

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			debugLog("activeFile 获取失败", file);

			new Notice(`Cps Plugins Failed get editor`);

			return;
		}

		const editor = this.getActiveEditor(activeFile.path);
		if (!editor) {
			new Notice(`Cps Plugins Failed get editor`);
			return;
		}
		// 提早获取当前的游标位置，确认当前行存在
		// 这里获取到的行是没用内容或者是未插入文件连接的行内容，有滞后性
		const cursor = editor.getCursor();
		let targetLine = cursor.line;

		const lineCountBe = editor.lineCount();

		const imgFilePath = parseObsidianUriToPath(this.app.vault.getResourcePath(file));
		const linkTextOld = this.makeLinkText(file, activeFile.path);

		const imgLocalUrl = await this.runCpsScripts(["cps", "--upload", `"${imgFilePath}"`]);
		if (!imgLocalUrl) return debugLog("获取链接失败");
		const linkTextNew = `![](${imgLocalUrl})`;

		// 因为文件创建有滞后性，必须在替换前再重新获取行的实例进行操作
		const lineCountAf = editor.lineCount();

		// 图片之前的内容被修改过了，行数发生了变化，尝试推算位置
		if (lineCountBe > lineCountAf) {
			targetLine -= lineCountBe - lineCountAf;
		}

		// 替换文本
		const line = editor.getLine(targetLine);
		editor.transaction({
			changes: [
				{
					from: { line: targetLine, ch: 0 },
					to: { line: targetLine, ch: line.length },
					text: line.replace(linkTextOld, linkTextNew),
				},
			],
		});

		// 判断是否修改成功，删除当前文件夹的旧图片
		const newLineStr = editor.getLine(targetLine);
		if (line != newLineStr) {
			debugLog("内容不同，修改成功");
			this.app.vault.delete(file);
		}
	};

	async onunload() {
		debugLog("cps plugins unload");
		this.app.vault.off("create", this.main);
	}

	async loadSettings() {
		this.settings = Object.assign({}, PLUGIN_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	getActiveFile() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const file = view?.file;
		debugLog("active file", file?.path);
		return file;
	}

	getActiveEditor(sourcePath: string) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view && view.file) {
			if (view.file.path == sourcePath) {
				return view.editor;
			}
		}
		return null;
	}

	makeLinkText(file: TFile, sourcePath: string, subpath?: string): string {
		return this.app.fileManager.generateMarkdownLink(file, sourcePath, subpath);
	}

	/**
	 * @description: 调用 cps-cli 的--upload指令，解析执行的结果
	 */
	async runCpsScripts(commands: string[]) {
		try {
			const command = commands.join(" ");
			// 使用 promisified exec 函数
			const { stdout, stderr } = await execAsync(command);

			// 返回 true 表示命令执行成功
			if (stdout) {
				const target = stdout.split("\n");
				for (let i in target) {
					if (target[i] == "Upload Success:") {
						let index = parseInt(i) + 1;
						return target[index];
					}
				}
			}

			return "";
		} catch (error) {
			console.error(`Error executing command: ${error.message}`);
			// 返回 false 表示命令执行失败
			return "";
		}
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName("开启插件")
			.setDesc("这是一个布尔值的配置选项")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.test).onChange(async (value) => {
					this.plugin.settings.test = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
