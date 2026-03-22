import { siteConfig } from "../config";

export function formatDateToYYYYMMDD(date: Date): string {
	return date.toISOString().substring(0, 10);
}

// 国际化日期格式化函数
export function formatDateI18n(dateString: string): string {
	const date = new Date(dateString);
	const lang = siteConfig.lang || "en";

	// 根据语言设置不同的日期格式
	const options: Intl.DateTimeFormatOptions = {
		year: "numeric",
		month: "long",
		day: "numeric",
	};

	// 语言代码映射
	const localeMap: Record<string, string> = {
		zh_CN: "zh-CN",
		zh_TW: "zh-TW",
		en: "en-US",
		ja: "ja-JP",
		ko: "ko-KR",
		es: "es-ES",
		th: "th-TH",
		vi: "vi-VN",
		tr: "tr-TR",
		id: "id-ID",
		fr: "fr-FR",
		de: "de-DE",
		ru: "ru-RU",
		ar: "ar-SA",
	};

	const locale = localeMap[lang] || "en-US";
	return date.toLocaleDateString(locale, options);
}

// 格式化时间（相对时间或人性化格式）
export function formatTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	const lang = siteConfig.lang || "en";
	const isZh = lang.startsWith("zh");

	if (diffSecs < 60) {
		return isZh ? "刚刚" : "just now";
	} else if (diffMins < 60) {
		return isZh ? `${diffMins}分钟前` : `${diffMins}m ago`;
	} else if (diffHours < 24) {
		return isZh ? `${diffHours}小时前` : `${diffHours}h ago`;
	} else if (diffDays < 7) {
		return isZh ? `${diffDays}天前` : `${diffDays}d ago`;
	} else {
		return formatDateI18n(dateString);
	}
}
