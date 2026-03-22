// 友情链接数据配置
// 用于管理友情链接页面的数据

export interface FriendItem {
	id: number;
	title: string;
	imgurl: string;
	desc: string;
	siteurl: string;
	tags: string[];
}

// 友情链接数据
export const friendsData: FriendItem[] = [
	{
		id: 1,
		title: "F0r7ynm",
		imgurl: "/assets/images/fortun.jpg",
		desc: "儿子",
		siteurl: "https://fsteinsgate.cn/",
		tags: ["网安"],
	},
	{
		id: 2,
		title: "linermao",
		imgurl: "/assets/images/linermao.png",
		desc: "大手子",
		siteurl: "https://linermao.github.io/",
		tags: ["大手子"],
	},
	{
		id: 3,
		title: "Mizuki",
		imgurl: "/assets/images/mizuki.png",
		desc: "网页前端的二改来源",
		siteurl: "https://github.com/matsuzaka-yuki/mizuki",
		tags: ["友链"],
	},
];

// 获取所有友情链接数据
export function getFriendsList(): FriendItem[] {
	return friendsData;
}

// 获取随机排序的友情链接数据
export function getShuffledFriendsList(): FriendItem[] {
	const shuffled = [...friendsData];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}
