/*
 * @Author: cpasion-office-win10 373704015@qq.com
 * @Date: 2023-10-12 15:02:02
 * @LastEditors: cpasion-office-win10 373704015@qq.com
 * @LastEditTime: 2023-11-09 16:44:36
 * @FilePath: \obsidian-plugin-ts\src\main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { App, Plugin, PluginSettingTab, Setting, FileSystemAdapter } from "obsidian";
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

		this.registerEvent(this.app.vault.on("create", this.replaceFileToUrl));

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		new Notice('cps plugins 加载完成')
	}

	async replaceFileToUrl(file: TFile) {
		debugLog("触发 this.app.vault.on - create");

		if (!(file instanceof TFile)) return;

		const timeGapMs = Date.now() - file.stat.ctime;

		// if the pasted image is created more than 1 second ago, ignore it
		if (timeGapMs > 1000) return;

		// 当前粘贴下来的不是图片文件
		if (!isImage(file) || !isPastedImage(file)) return;

		debugLog("发现图片文件被创建", file);
		const activeFile: TFile = this.app.workspace.getActiveFile() as TFile;
		const imgFilePath = parseObsidianUriToPath(this.app.vault.getResourcePath(file));
		const linkTextOld = this.makeLinkText(file, activeFile.path);

		const imgLocalUrl = await this.shell(["cps", "--upload", `"${imgFilePath}"`]);
		if (!imgLocalUrl) return debugLog("获取链接失败");
		const linkTextNew = `![](${imgLocalUrl})`;

		const editor = this.getActiveEditor(activeFile.path);
		if (!editor) {
			new Notice(`Cps Plugins Failed get editor`);
			return;
		}
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);

		debugLog("current line", line);

		editor.transaction({
			changes: [
				{
					from: { ...cursor, ch: 0 },
					to: { ...cursor, ch: line.length },
					text: line.replace(linkTextOld, linkTextNew),
				},
			],
		});
	}

	async onunload() {
		debugLog("cps plugins unload");
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

	// returns a new name for the input file, with extension
	async generateNewName(file: TFile, activeFile: TFile): Promise<string> {
		const newName = activeFile.basename + "-" + Date.now();
		const extension = this.settings.pngToJpeg ? "jpeg" : file.extension;

		return `${newName}.${extension}`;
	}

	async keepOrgName(file: TFile, activeFile: TFile): Promise<string> {
		const newName = file.basename;
		const extension = this.settings.pngToJpeg ? "jpeg" : file.extension;

		return `${newName}.${extension}`;
	}

	makeLinkText(file: TFile, sourcePath: string, subpath?: string): string {
		return this.app.fileManager.generateMarkdownLink(file, sourcePath, subpath);
	}

	async shell(commands: string[]) {
		try {
			const command = commands.join(" ");
			// 使用 promisified exec 函数
			const { stdout, stderr } = await execAsync(command);

			// 返回 true 表示命令执行成功
			if (stdout) return this.parserShellResult(stdout);

			return "";
		} catch (error) {
			console.error(`Error executing command: ${error.message}`);
			// 返回 false 表示命令执行失败
			return "";
		}
	}

	async parserShellResult(stdout: string) {
		const target = stdout.split("\n");
		for (let i in target) {
			if (target[i] == "Upload Success:") {
				let index = parseInt(i) + 1;
				return target[index];
			}
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
		// new Setting(containerEl)
		// 	.setName("")
		// 	.setDesc(
		// 		"这是一个自用插件，用于每次通过粘贴板图片复制到md文件时，将会调用本地的图片服务器上传服务"
		// 	)
		// 	.addText((text) =>
		// 		text
		// 			.setPlaceholder("Enter your secret")
		// 			.setValue(this.plugin.settings.mySetting)

		// 			.onChange(async (value) => {
		// 				this.plugin.settings.mySetting = value;
		// 				await this.plugin.saveSettings();
		// 			})
		// 	);

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
