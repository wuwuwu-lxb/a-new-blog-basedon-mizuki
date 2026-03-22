<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import { fade, slide } from "svelte/transition";
import { formatTime } from "../../utils/date-utils";
import { AUTH_TOKEN_KEY } from "../../utils/constants";

// 组件状态
let isOpen = $state(false);
let notifications: Notification[] = $state([]);
let unreadCount = $state(0);
let isLoading = $state(false);

// 用户登录状态
let isLoggedIn = $state(false);

interface Notification {
	id: number;
	type: string;
	content: string;
	isRead: boolean;
	createdAt: string;
	fromUser?: {
		id: number;
		name: string;
		avatar?: string;
	};
	comment?: {
		id: number;
		content: string;
		articleSlug: string;
		articleId?: number;
	};
}

// 加载通知
async function loadNotifications() {
	if (!isLoggedIn) return;

	isLoading = true;
	try {
		const token = typeof localStorage !== "undefined"
			? localStorage.getItem(AUTH_TOKEN_KEY)
			: null;

		if (!token) return;

		const response = await fetch("/api/notifications", {
			headers: {
				"Authorization": `Bearer ${token}`,
			},
		});

		const data = await response.json();
		if (response.ok) {
			notifications = data.notifications || [];
			unreadCount = data.unreadCount || 0;
		}
	} catch (error) {
		console.error("Failed to load notifications:", error);
	} finally {
		isLoading = false;
	}
}

// 标记为已读（并删除）
async function markAsRead(notificationId: number) {
	const token = typeof localStorage !== "undefined"
		? localStorage.getItem(AUTH_TOKEN_KEY)
		: null;

	if (!token) return;

	try {
		const res = await fetch("/api/notifications", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${token}`,
			},
			body: JSON.stringify({ notificationId }),
		});

		if (res.ok) {
			// 从列表中移除该通知
			notifications = notifications.filter(n => n.id !== notificationId);
			unreadCount = Math.max(0, unreadCount - 1);
		}
	} catch (error) {
		console.error("Mark as read error:", error);
	}
}

// 标记所有为已读（并删除）
async function markAllAsRead() {
	const token = typeof localStorage !== "undefined"
		? localStorage.getItem(AUTH_TOKEN_KEY)
		: null;

	if (!token) return;

	try {
		const res = await fetch("/api/notifications", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${token}`,
			},
			body: JSON.stringify({ markAllRead: true }),
		});

		if (res.ok) {
			// 清空通知列表
			notifications = [];
			unreadCount = 0;
		}
	} catch (error) {
		console.error("Mark all as read error:", error);
	}
}

// 跳转到评论位置
function jumpToComment(comment: Notification['comment']) {
	if (!comment) return;

	const articleSlug = comment.articleSlug;
	if (!articleSlug) return;

	// 跳转到文章页面并定位到评论
	window.location.href = `/posts/${articleSlug}#comment-${comment.id}`;
}

// 从 localStorage 加载用户状态
function loadAuthState() {
	try {
		if (typeof localStorage !== "undefined") {
			const savedUser = localStorage.getItem("mizuki-auth-user");
			const savedToken = localStorage.getItem("mizuki-auth-token");
			if (savedUser && savedToken) {
				isLoggedIn = true;
				loadNotifications();
			}
		}
	} catch (e) {
		console.warn("Failed to load auth state:", e);
	}
}

onMount(() => {
	loadAuthState();
});
</script>

<!-- 通知按钮 -->
{#if isLoggedIn}
<button
	class="notification-btn btn-plain px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-(--btn-plain-bg-hover) transition-all relative"
	on:click={() => { isOpen = !isOpen; if (isOpen) loadNotifications(); }}
	title="通知"
>
	<Icon icon="material-symbols:notifications" class="text-xl" />
	{#if unreadCount > 0}
	<span class="notification-badge absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
		{unreadCount > 9 ? '9+' : unreadCount}
	</span>
	{/if}
</button>

<!-- 通知面板 -->
<div
	class="notification-overlay fixed inset-0 z-50 flex items-start justify-end bg-black/50 pt-16 pr-8"
	transition:fade={{ duration: 200 }}
	on:click={() => isOpen = false}
	class:opacity-0={!isOpen}
	class:pointer-events-none={!isOpen}
>
	<div
		class="notification-panel card-base bg-(--card-bg) shadow-2xl rounded-2xl w-96 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col"
		transition:slide={{ duration: 300, axis: 'x' }}
		on:click|stopPropagation
		class:opacity-0={!isOpen}
		class:translate-x-4={!isOpen}
		style="margin-top: 1rem;"
	>
		<!-- 头部 -->
		<div class="notification-header flex items-center justify-between p-4 border-b border-black/5 dark:border-white/10">
			<h3 class="font-semibold text-90 text-lg">通知</h3>
			<div class="flex items-center gap-2">
				{#if unreadCount > 0}
				<button
					class="btn-plain px-2 py-1 rounded text-xs text-(--primary)"
					on:click={markAllAsRead}
				>
					全部已读
				</button>
				{/if}
				<button
					class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
					on:click={() => isOpen = false}
				>
					<Icon icon="material-symbols:close" class="text-lg" />
				</button>
			</div>
		</div>

		<!-- 通知列表 -->
		<div class="notification-list overflow-y-auto flex-1">
			{#if isLoading}
			<div class="loading flex justify-center py-8">
				<Icon icon="eos-icons:loading" class="text-3xl animate-spin text-50" />
			</div>
			{:else if notifications.length === 0}
			<div class="empty flex flex-col items-center justify-center py-8 text-50 text-sm">
				<Icon icon="material-symbols:notifications-none" class="text-4xl mb-2 opacity-50" />
				<span>暂无通知</span>
			</div>
			{:else}
			<div class="space-y-1 p-2">
				{#each notifications as notification}
				<div
					class="notification-item flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors {notification.isRead ? 'hover:bg-(--btn-regular-bg)' : 'bg-(--primary)/5 hover:bg-(--primary)/10'}"
					on:click={async () => { await markAsRead(notification.id); jumpToComment(notification.comment); }}
				>
					<!-- 未读标记 -->
					{#if !notification.isRead}
					<span class="unread-dot w-2 h-2 rounded-full bg-(--primary) mt-2 shrink-0"></span>
					{:else}
					<span class="w-2 mt-2 shrink-0"></span>
					{/if}

					<!-- 发送者头像 -->
					{#if notification.fromUser?.avatar}
					<img src={notification.fromUser.avatar} alt={notification.fromUser.name} class="w-8 h-8 rounded-full object-cover shrink-0" />
					{:else}
					<div class="w-8 h-8 rounded-full bg-(--primary) flex items-center justify-center text-white text-sm font-medium shrink-0">
						{notification.fromUser?.name?.charAt(0) || "?"}
					</div>
					{/if}

					<!-- 通知内容 -->
					<div class="flex-1 min-w-0">
						<div class="notification-content text-sm text-90">
							{notification.content}
						</div>
						{#if notification.comment}
						<div class="comment-preview text-xs text-50 mt-1 truncate">
							"{notification.comment.content}"
						</div>
						{/if}
						<div class="notification-time text-xs text-50 mt-1">
							{formatTime(notification.createdAt)}
						</div>
					</div>
				</div>
				{/each}
			</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
.notification-panel {
	animation: slide-in-right 0.3s ease-out;
}

@keyframes slide-in-right {
	from {
		opacity: 0;
		transform: translateX(20px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

.unread-dot {
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}
</style>
