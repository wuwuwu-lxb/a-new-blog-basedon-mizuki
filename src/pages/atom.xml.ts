import type { APIContext } from "astro";
import sanitizeHtml from "sanitize-html";
import { profileConfig, siteConfig } from "@/config";
import { getSortedPosts } from "@/utils/content-utils";
import { getPostUrl } from "@/utils/url-utils";

export async function GET(context: APIContext) {
	if (!context.site) {
		throw Error("site not set");
	}

	// Use the same ordering as site listing (pinned first, then by published desc)
	// 过滤掉加密文章和草稿文章
	const posts = (await getSortedPosts()).filter(
		(post) => !post.encrypted && post.draft !== true,
	);

	// 创建Atom feed头部
	let atomFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${siteConfig.title}</title>
  <subtitle>${siteConfig.subtitle || "No description"}</subtitle>
  <link href="${context.site}" rel="alternate" type="text/html"/>
  <link href="${new URL("atom.xml", context.site)}" rel="self" type="application/atom+xml"/>
  <id>${context.site}</id>
  <updated>${new Date().toISOString()}</updated>
  <language>${siteConfig.lang}</language>`;

	for (const post of posts) {
		const publishedDate = post.publishedAt || post.createdAt;
		const updatedDate = post.modifiedAt || publishedDate;

		// 添加Atom条目
		const postUrl = new URL(getPostUrl(post), context.site).href;
		const content = sanitizeHtml(post.content, {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
		});

		atomFeed += `
  <entry>
    <title>${post.title}</title>
    <link href="${postUrl}" rel="alternate" type="text/html"/>
    <id>${postUrl}</id>
    <published>${publishedDate.toISOString()}</published>
    <updated>${updatedDate.toISOString()}</updated>
    <summary>${post.excerpt || ""}</summary>
    <content type="html"><![CDATA[${content}]]></content>
    <author>
      <name>${profileConfig.name}</name>
    </author>`;

		// 添加分类标签
		if (post.categories[0]?.name) {
			atomFeed += `
    <category term="${post.categories[0].name}"></category>`;
		}

		atomFeed += `
  </entry>`;
	}

	// 关闭Atom feed
	atomFeed += `
</feed>`;

	return new Response(atomFeed, {
		headers: {
			"Content-Type": "application/atom+xml; charset=utf-8",
		},
	});
}
