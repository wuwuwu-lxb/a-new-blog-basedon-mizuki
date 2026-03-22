/**
 * 文章工具函数 - 从数据库获取文章
 */

import { prisma } from '@/lib/prisma';
import { getCategoryUrl, getPostUrlBySlug } from '@utils/url-utils';
import { initPostIdMap } from '@utils/permalink-utils';
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export type DbArticle = {
	id: number;
	title: string;
	slug: string;
	content: string;
	rawContent: string;
	excerpt: string | null;
	cover: string | null;
	published: boolean;
	views: number;
	createdAt: Date;
	updatedAt: Date;
	publishedAt: Date | null;
	authorId: number;
	draft: boolean;
	modifiedAt: Date | null;
	lang: string | null;
	pinned: boolean;
	comment: boolean;
	priority: number | null;
	authorName: string | null;
	sourceLink: string | null;
	licenseName: string | null;
	licenseUrl: string | null;
	encrypted: boolean;
	password: string | null;
	permalink: string | null;
	alias: string | null;
	prevSlug: string | null;
	prevTitle: string | null;
	nextSlug: string | null;
	nextTitle: string | null;
	numericId: number | null;
	tags: Array<{ id: number; name: string; slug: string }>;
	categories: Array<{ id: number; name: string; slug: string }>;
	author: { id: number; name: string | null; avatar: string | null } | null;
};

// 获取所有排序后的文章（从数据库）
export async function getRawSortedPosts(): Promise<DbArticle[]> {
	const where = import.meta.env.PROD ? { published: true } : {};

	const articles = await prisma.article.findMany({
		where,
		include: {
			author: {
				select: { id: true, name: true, avatar: true },
			},
			tags: true,
			categories: true,
		},
		orderBy: [
			{ pinned: 'desc' },
			{ priority: 'asc' },
			{ publishedAt: 'desc' },
		],
	});

	// 按置顶和 priority 排序后再按发布日期排序
	const sorted = articles.sort((a, b) => {
		// 首先按置顶状态排序，置顶文章在前
		if (a.pinned && !b.pinned) return -1;
		if (!a.pinned && b.pinned) return 1;

		// 如果置顶状态相同，优先按 Priority 排序（数值越小越靠前）
		if (a.pinned && b.pinned) {
			const priorityA = a.priority;
			const priorityB = b.priority;
			if (priorityA !== null && priorityB !== null) {
				if (priorityA !== priorityB) return priorityA - priorityB;
			} else if (priorityA !== null) {
				return -1;
			} else if (priorityB !== null) {
				return 1;
			}
		}

		// 否则按发布日期排序
		const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
		const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
		return dateB - dateA;
	});

	return sorted;
}

// 获取排序后的文章列表（带 prev/next 链接）
export async function getSortedPosts(): Promise<DbArticle[]> {
	const sorted = await getRawSortedPosts();
	return sorted;
}

// 获取文章列表用于显示
export async function getSortedPostsList(): Promise<DbArticle[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// 初始化文章 ID 映射（用于 permalink 功能）
	initPostIdMap(sortedFullPosts);

	return sortedFullPosts;
}

export type PostForList = {
	id: string;
	slug: string;
	data: {
		title: string;
		published: Date;
		updated?: Date;
		description: string;
		rawContent: string;
		image: string;
		tags: string[];
		category: string | null;
		lang: string;
		pinned: boolean;
		comment: boolean;
		priority: number | null;
		author: string;
		sourceLink: string;
		licenseName: string;
		licenseUrl: string;
		views: number;
		encrypted: boolean;
		password: string;
		permalink: string;
		alias: string;
		prevTitle: string;
		prevSlug: string;
		nextTitle: string;
		nextSlug: string;
	};
	url?: string;
};

export async function getSortedPostsListWithUrl(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// 初始化文章 ID 映射
	initPostIdMap(sortedFullPosts);

	// 转换为兼容格式
	const sortedPostsList = sortedFullPosts.map((post) => ({
		id: String(post.id),
		slug: post.slug,
		data: {
			title: post.title,
			published: post.publishedAt || post.createdAt,
			updated: post.modifiedAt || undefined,
			description: post.excerpt || '',
			rawContent: post.rawContent || '',
			image: post.cover || '',
			tags: post.tags.map((t) => t.name),
			category: post.categories[0]?.name || null,
			lang: post.lang || '',
			pinned: post.pinned,
			comment: post.comment,
			priority: post.priority,
			author: post.authorName || '',
			sourceLink: post.sourceLink || '',
			licenseName: post.licenseName || '',
			licenseUrl: post.licenseUrl || '',
			views: post.views,
			encrypted: post.encrypted,
			password: post.password || '',
			permalink: post.permalink || '',
			alias: post.alias || '',
			prevTitle: post.prevTitle || '',
			prevSlug: post.prevSlug || '',
			nextTitle: post.nextTitle || '',
			nextSlug: post.nextSlug || '',
		},
		url: getPostUrlBySlug(post.slug),
	}));

	return sortedPostsList;
}

export type TagInfo = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<TagInfo[]> {
	const articles = await prisma.article.findMany({
		where: import.meta.env.PROD ? { published: true } : {},
		include: {
			tags: true,
		},
	});

	const countMap: { [key: string]: number } = {};
	articles.forEach((post) => {
		post.tags.forEach((tag) => {
			if (!countMap[tag.name]) countMap[tag.name] = 0;
			countMap[tag.name]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type CategoryInfo = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<CategoryInfo[]> {
	const articles = await prisma.article.findMany({
		where: import.meta.env.PROD ? { published: true } : {},
		include: {
			categories: true,
		},
	});

	const count: { [key: string]: number } = {};
	articles.forEach((post) => {
		if (post.categories.length === 0) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		// 只取第一个分类
		const categoryName = post.categories[0].name.trim();
		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: CategoryInfo[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c),
		});
	}
	return ret;
}

// 根据 slug 获取单篇文章
export async function getArticleBySlug(slug: string): Promise<DbArticle | null> {
	const article = await prisma.article.findUnique({
		where: { slug },
		include: {
			author: {
				select: { id: true, name: true, avatar: true },
			},
			tags: true,
			categories: true,
		},
	});
	return article;
}
