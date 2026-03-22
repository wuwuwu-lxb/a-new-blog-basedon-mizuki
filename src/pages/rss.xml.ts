import type { RSSFeedItem } from "@astrojs/rss";
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/config";
import { getSortedPosts } from "@/utils/content-utils";
import { getPostUrl } from "@/utils/url-utils";

export async function GET(context: APIContext) {
	if (!context.site) {
		throw Error("site not set");
	}

	// Use the same ordering as site listing (pinned first, then by published desc)
	const posts = (await getSortedPosts()).filter(
		(post) => !post.encrypted,
	);

	const feed: RSSFeedItem[] = [];

	for (const post of posts) {
		const publishedDate = post.publishedAt || post.createdAt;

		feed.push({
			title: post.title,
			description: post.excerpt || "",
			pubDate: publishedDate,
			link: getPostUrl(post),
			// sanitize the HTML content
			content: sanitizeHtml(post.content, {
				allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
			}),
		});
	}

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site,
		items: feed,
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
