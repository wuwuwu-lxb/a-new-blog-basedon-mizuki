<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import { fade, slide } from "svelte/transition";
import type { User, Comment } from "../../types/comment";

// 文章 slug（从 Astro props 传入）
let { commentSlug }: { commentSlug: string } = $props();

// 评论列表
let comments: Comment[] = $state([]);
let isLoading = $state(true);

// 当前用户信息
let isLoggedIn = $state(false);
let currentUser: User | null = null;

// 新评论内容
let newComment = $state("");
let isSubmitting = $state(false);

// 回复相关
let replyingTo: number | null = $state(null);
let replyContent = $state("");

// 加载评论
async function loadComments() {
	if (!commentSlug) {
		isLoading = false;
		return;
	}

	try {
		const response = await fetch(`/api/comments?articleSlug=${encodeURIComponent(commentSlug)}&status=APPROVED`);
		const data = await response.json();
		if (response.ok) {
			comments = data.comments || [];
		}
	} catch (error) {
		console.error("Failed to load comments:", error);
	} finally {
		isLoading = false;
	}
}

// 提交评论
async function submitComment() {
	if (!newComment.trim()) return;
	if (!isLoggedIn) {
		alert("请先登录后再评论");
		return;
	}
	if (!commentSlug) {
		alert("文章信息加载中，请稍后");
		return;
	}

	// 获取 token
	const token = typeof localStorage !== "undefined"
		? localStorage.getItem("mizuki-auth-token")
		: null;

	if (!token) {
		alert("请先登录");
		return;
	}

	isSubmitting = true;

	try {
		const response = await fetch("/api/comments", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${token}`,
			},
			body: JSON.stringify({
				articleSlug: commentSlug,
				content: newComment.trim(),
				parentId: null,
			}),
		});

		const data = await response.json();

		if (response.ok) {
			// 重新加载评论
			await loadComments();
			newComment = "";
		} else {
			alert(data.error || "评论失败");
		}
	} catch (error) {
		console.error("Submit comment error:", error);
		alert("评论失败，请重试");
	} finally {
		isSubmitting = false;
	}
}

// 提交回复
async function submitReply(parentId: number) {
	if (!replyContent.trim()) return;
	if (!isLoggedIn) {
		alert("请先登录后再评论");
		return;
	}
	if (!commentSlug) {
		alert("文章信息加载中，请稍后");
		return;
	}

	// 获取 token
	const token = typeof localStorage !== "undefined"
		? localStorage.getItem("mizuki-auth-token")
		: null;

	if (!token) {
		alert("请先登录");
		return;
	}

	isSubmitting = true;

	try {
		const response = await fetch("/api/comments", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${token}`,
			},
			body: JSON.stringify({
				articleSlug: commentSlug,
				content: replyContent.trim(),
				parentId,
			}),
		});

		const data = await response.json();

		if (response.ok) {
			await loadComments();
			replyContent = "";
			replyingTo = null;
		} else {
			alert(data.error || "回复失败");
		}
	} catch (error) {
		console.error("Submit reply error:", error);
		alert("回复失败，请重试");
	} finally {
		isSubmitting = false;
	}
}

// 删除评论
async function deleteComment(commentId: number) {
	if (!confirm("确定要删除这条评论吗？")) return;

	// 获取 token
	const token = typeof localStorage !== "undefined"
		? localStorage.getItem("mizuki-auth-token")
		: null;

	if (!token) {
		alert("请先登录");
		return;
	}

	try {
		const response = await fetch(`/api/comments/${commentId}`, {
			method: "DELETE",
			headers: {
				"Authorization": `Bearer ${token}`,
			},
		});

		if (response.ok) {
			await loadComments();
		} else {
			const data = await response.json();
			alert(data.error || "删除失败");
		}
	} catch (error) {
		console.error("Delete comment error:", error);
		alert("删除失败，请重试");
	}
}

// 从 localStorage 加载用户状态
function loadAuthState() {
	try {
		if (typeof localStorage !== "undefined") {
			const savedUser = localStorage.getItem("mizuki-auth-user");
			const savedToken = localStorage.getItem("mizuki-auth-token");
			if (savedUser && savedToken) {
				currentUser = JSON.parse(savedUser);
				isLoggedIn = true;
			}
		}
	} catch (e) {
		console.warn("Failed to load auth state:", e);
	}
}

onMount(() => {
	loadAuthState();
	loadComments();
});

// 检查是否可以删除评论（管理员或作者本人）
function canDelete(comment: Comment): boolean {
	if (!currentUser) return false;
	if (currentUser.role === "ADMIN") return true;
	return comment.author?.id === currentUser.id;
}

// 格式化时间
function formatTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "刚刚";
	if (minutes < 60) return `${minutes}分钟前`;
	if (hours < 24) return `${hours}小时前`;
	if (days < 7) return `${days}天前`;
	return date.toLocaleDateString("zh-CN");
}
</script>

<div class="comments-container">
	<!-- 评论标题 -->
	<div class="comments-header flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold">
			评论 {comments.length > 0 ? `(${comments.length})` : ""}
		</h3>
	</div>

	<!-- 登录提示 -->
	{#if !isLoggedIn}
	<div class="login-tip bg-(--btn-regular-bg) rounded-lg p-4 mb-4 text-center">
		<p class="text-50 text-sm">登录后参与讨论</p>
	</div>
	{:else}
	<!-- 发表评论输入框 -->
	<div class="comment-form mb-6">
		<textarea
			bind:value={newComment}
			class="w-full bg-(--btn-regular-bg) rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary) min-h-[100px]"
			placeholder="写下你的评论..."
			disabled={isSubmitting}
		></textarea>
		<div class="flex justify-end mt-2">
			<button
				on:click={submitComment}
				disabled={!newComment.trim() || isSubmitting}
				class="btn-regular px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isSubmitting}
					<Icon icon="eos-icons:loading" class="animate-spin" />
					<span>发送中...</span>
				{:else}
					<Icon icon="material-symbols:send" />
					<span>评论</span>
				{/if}
			</button>
		</div>
	</div>
	{/if}

	<!-- 评论列表 -->
	{#if isLoading}
	<div class="loading flex justify-center py-8">
		<Icon icon="eos-icons:loading" class="text-3xl animate-spin text-50" />
	</div>
	{:else if comments.length === 0}
	<div class="empty flex justify-center py-8 text-50 text-sm">
		暂无评论，快来抢沙发吧~
	</div>
	{:else}
	<div class="comments-list space-y-4">
		{#each comments as comment}
		<div class="comment-item bg-(--btn-regular-bg) rounded-lg p-4">
			<div class="comment-header flex items-start justify-between mb-2">
				<div class="author-info flex items-center gap-2">
					{#if comment.author?.avatar}
						<img src={comment.author.avatar} alt={comment.author.name || "匿名用户"} class="w-8 h-8 rounded-full object-cover" />
					{:else}
						<div class="w-8 h-8 rounded-full bg-(--primary) flex items-center justify-center text-white text-sm font-medium">
							{comment.author?.name?.charAt(0) || comment.guestName?.charAt(0) || "?"}
						</div>
					{/if}
					<div class="flex flex-col">
						<span class="text-sm font-medium">
							{comment.author?.name || comment.guestName || "匿名用户"}
						</span>
						<span class="text-xs text-50">{formatTime(comment.createdAt)}</span>
					</div>
				</div>
				{#if canDelete(comment)}
				<button
					on:click={() => deleteComment(comment.id)}
					class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10"
					title="删除评论"
				>
					<Icon icon="material-symbols:delete-outline" />
				</button>
				{/if}
			</div>
			<div class="comment-content text-sm text-90 whitespace-pre-wrap mb-3">
				{comment.content}
			</div>
			<!-- 回复按钮 -->
			{#if isLoggedIn}
			<div class="comment-actions flex items-center gap-2">
				<button
					on:click={() => { replyingTo = replyingTo === comment.id ? null : comment.id; }}
					class="text-xs text-50 hover:text-(--primary) flex items-center gap-1"
				>
					<Icon icon="material-symbols:reply" class="text-xs" />
					回复
				</button>
			</div>
			{/if}

			<!-- 回复输入框 -->
			{#if replyingTo === comment.id}
			<div class="reply-form mt-3">
				<textarea
					bind:value={replyContent}
					class="w-full bg-(--card-bg) rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary) min-h-[60px]"
					placeholder={`回复 @${comment.author?.name || comment.guestName || "匿名用户"}...`}
					disabled={isSubmitting}
				></textarea>
				<div class="flex justify-end gap-2 mt-2">
					<button
						on:click={() => { replyingTo = null; replyContent = ""; }}
						disabled={isSubmitting}
						class="btn-plain px-3 py-1.5 rounded-lg text-sm"
					>
						取消
					</button>
					<button
						on:click={() => submitReply(comment.id)}
						disabled={!replyContent.trim() || isSubmitting}
						class="btn-regular px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50"
					>
						{#if isSubmitting}
							<Icon icon="eos-icons:loading" class="animate-spin" />
						{:else}
							<Icon icon="material-symbols:send" class="text-xs" />
						{/if}
						回复
					</button>
				</div>
			</div>
			{/if}

			<!-- 回复列表 -->
			{#if comment.replies && comment.replies.length > 0}
			<div class="replies mt-3 space-y-2 pl-4 border-l-2 border-(--line-divider)">
				{#each comment.replies as reply}
				<div class="reply-item bg-(--card-bg) rounded-lg p-3">
					<div class="reply-header flex items-start justify-between mb-2">
						<div class="author-info flex items-center gap-2">
							{#if reply.author?.avatar}
								<img src={reply.author.avatar} alt={reply.author.name || "匿名用户"} class="w-6 h-6 rounded-full object-cover" />
							{:else}
								<div class="w-6 h-6 rounded-full bg-(--primary) flex items-center justify-center text-white text-xs font-medium">
									{reply.author?.name?.charAt(0) || reply.guestName?.charAt(0) || "?"}
								</div>
							{/if}
							<span class="text-sm font-medium">
								{reply.author?.name || reply.guestName || "匿名用户"}
							</span>
							<span class="text-xs text-50">{formatTime(reply.createdAt)}</span>
						</div>
						{#if canDelete(reply)}
						<button
							on:click={() => deleteComment(reply.id)}
							class="btn-plain w-6 h-6 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10"
							title="删除回复"
						>
							<Icon icon="material-symbols:delete-outline" class="text-sm" />
						</button>
						{/if}
					</div>
					<div class="reply-content text-sm text-90 whitespace-pre-wrap">
						{reply.content}
					</div>
				</div>
				{/each}
			</div>
			{/if}
		</div>
		{/each}
	</div>
	{/if}
</div>

<style>
.comments-container {
	animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
