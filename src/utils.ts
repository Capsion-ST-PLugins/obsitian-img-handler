/*
 * @Author: cpasion-office-win10 373704015@qq.com
 * @Date: 2023-10-13 16:54:48
 * @LastEditors: cpasion-office-win10 373704015@qq.com
 * @LastEditTime: 2023-11-08 11:21:17
 * @FilePath: \obsidian-plugin-ts\src\utils.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { TFile, TAbstractFile } from "obsidian";

export const PASTED_IMAGE_PREFIX = "Pasted image ";

export function isPastedImage(file: TAbstractFile): boolean {
	if (file instanceof TFile) {
		if (file.name.startsWith(PASTED_IMAGE_PREFIX)) {
			return true;
		}
	}
	return false;
}

export function isImage(file: TAbstractFile, IMAGE_EXTS = ["jpg", "jpeg", "png"]): boolean {
	if (file instanceof TFile) {
		if (IMAGE_EXTS.contains(file.extension.toLowerCase())) {
			return true;
		}
	}
	return false;
}

export interface ObsidianUriInfo {
	vaultId: string;
	filePath: string;
	timestamp?: string;
}

export function parseObsidianUriToPath(uri: string): string {
	const obsidianUriRegex = /^app:\/\/([^\/]+)\/([^?]+)(\?.+)?$/;
	const match = uri.match(obsidianUriRegex);

	if (match) {
		const [, vaultId, filePath] = match;
		const info: ObsidianUriInfo = {
			vaultId,
			filePath:decodeURIComponent(filePath),
		};

		return info.filePath;
	}

	return "";
}

export function ConvertImage(file: Blob, quality: number): Promise<ArrayBuffer | null> {
	return new Promise((resolve, reject) => {
		let reader = new FileReader(); // 读取file
		reader.onloadend = function (e) {
			let image = new Image(); // 新建一个img标签（还没嵌入DOM节点)
			image.onload = function () {
				let canvas = document.createElement("canvas");
				let context = canvas.getContext("2d");
				let imageWidth = image.width;
				let imageHeight = image.height;
				let data = "";

				if (!canvas || !context) return reject(new Error("获取canvas实例失败")); // 使用 reject 报告错误
				canvas.width = imageWidth;
				canvas.height = imageHeight;

				context.fillStyle = "#fff";
				context.fillRect(0, 0, imageWidth, imageHeight);
				context.save();

				context.translate(imageWidth / 2, imageHeight / 2);
				context.drawImage(image, 0, 0, imageWidth, imageHeight, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
				context.restore();

				data = canvas.toDataURL("image/jpeg", quality);

				var arrayBuffer = base64ToArrayBuffer(data);
				resolve(arrayBuffer);
			};

			if (e && e.target) image.src = e.target.result!.toString() || ""; // 将图片的路径设成file路径
		};

		reader.onerror = function (error) {
			reject(error); // 处理读取错误
		};

		reader.readAsDataURL(file);
	});
}

function base64ToArrayBuffer(code: string): ArrayBuffer {
	const parts = code.split(";base64,");
	const contentType = parts[0].split(":")[1];
	const fileExt = contentType.split("/")[1];
	const raw = window.atob(parts[1]);
	const rawLength = raw.length;

	const uInt8Array = new Uint8Array(rawLength);

	for (let i = 0; i < rawLength; ++i) {
		uInt8Array[i] = raw.charCodeAt(i);
	}
	return uInt8Array.buffer;
}
