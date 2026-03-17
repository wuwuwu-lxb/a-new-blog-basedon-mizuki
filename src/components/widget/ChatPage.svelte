<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";

// Pio 实例引用
let pioInstance: any = null;

// 聊天状态
let isLoading = $state(false);

// 消息列表
interface Article {
	slug: string;
	title: string;
	description: string;
	url: string;
	similarity?: number;
}

interface Message {
	id: number;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
	articles?: Article[];
}

let messages = $state<Message[]>([]);
let userInput = $state("");
let messagesContainer: HTMLDivElement;

// 系统提示词配置
let systemPrompt = $state("你是一个友好、博学的助手，名字叫小晤。请用简洁、温暖的语气回答问题。");
let apiEndpoint = $state("/api/chat");

// localStorage 键
const STORAGE_KEY_MESSAGES = "chat-page-messages";
const STORAGE_KEY_SYSTEM_PROMPT = "chat-page-system-prompt";

// 默认配置
const DEFAULT_CONFIG = {
	systemPrompt: "你是一个友好、博学的助手，名字叫小晤。请用简洁、温暖的语气回答问题。",
	apiEndpoint: "/api/chat",
};

// 从 localStorage 加载配置
function loadSettings() {
	try {
		if (typeof localStorage !== "undefined") {
			// 首先尝试从管理后台配置读取
			const adminConfig = localStorage.getItem('chat-settings');
			if (adminConfig) {
				const config = JSON.parse(adminConfig);
				systemPrompt = config.systemPrompt || DEFAULT_CONFIG.systemPrompt;
				apiEndpoint = config.apiEndpoint || DEFAULT_CONFIG.apiEndpoint;
			} else {
				// 回退到旧的存储方式
				const savedMessages = localStorage.getItem(STORAGE_KEY_MESSAGES);
				if (savedMessages) {
					const parsed = JSON.parse(savedMessages);
					messages = parsed.map((m: any) => ({
						...m,
						timestamp: new Date(m.timestamp),
					}));
				}

				const savedPrompt = localStorage.getItem(STORAGE_KEY_SYSTEM_PROMPT);
				if (savedPrompt) {
					systemPrompt = savedPrompt;
				}
			}
		}
	} catch (e) {
		console.warn("Failed to load chat settings:", e);
	}
}

// 保存消息到 localStorage
function saveMessages() {
	try {
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
		}
	} catch (e) {
		console.warn("Failed to save messages:", e);
	}
}

// 滚动到底部
function scrollToBottom() {
	if (messagesContainer) {
		setTimeout(() => {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}, 100);
	}
}

// 发送消息
async function sendMessage() {
	if (!userInput.trim() || isLoading) return;

	const userMessage: Message = {
		id: Date.now(),
		role: "user",
		content: userInput.trim(),
		timestamp: new Date(),
	};

	messages.push(userMessage);
	userInput = "";
	isLoading = true;
	saveMessages();
	scrollToBottom();

	// 通过看板娘显示"思考中"状态
	showPioMessage("让我想想...", 2000);

	try {
		const response = await fetch(apiEndpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				messages: [
					{ role: "system", content: systemPrompt },
					...messages.slice(-10).map((m) => ({
						role: m.role,
						content: m.content,
					})),
				],
			}),
		});

		if (!response.ok) throw new Error("API 请求失败");

		const data = await response.json();
		const assistantMessage: Message = {
			id: Date.now() + 1,
			role: "assistant",
			content: data.content || data.message || data.response || "抱歉，我没有理解你的问题。",
			timestamp: new Date(),
			articles: data.articles || [],
		};

		messages.push(assistantMessage);
		saveMessages();
		scrollToBottom();

		// 通过看板娘显示回复（简短摘要）
		const shortSummary = assistantMessage.content.length > 50
			? assistantMessage.content.substring(0, 50) + "..."
			: assistantMessage.content;
		showPioMessage(shortSummary, 3000);
	} catch (error) {
		console.error("Chat error:", error);

		const errorMessage: Message = {
			id: Date.now() + 1,
			role: "assistant",
			content: "抱歉，连接失败了，请检查网络设置。",
			timestamp: new Date(),
		};
		messages.push(errorMessage);
		showPioMessage("出错了...请检查网络设置", 3000);
		saveMessages();
		scrollToBottom();
	} finally {
		isLoading = false;
	}
}

// 通过 Pio 显示消息
function showPioMessage(text: string, duration: number = 3000) {
	if (typeof window !== "undefined" && window.pioInstance) {
		window.pioInstance.message(text, { time: duration });
	}
}

// 清除聊天记录
function clearMessages() {
	if (confirm("确定要清空聊天记录吗？")) {
		messages = [];
		saveMessages();
		showPioMessage("聊天记录已清空~", 2000);
	}
}

// 键盘事件处理
function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		sendMessage();
	}
}

// 格式化时间
function formatTime(date: Date): string {
	return new Intl.DateTimeFormat('zh-CN', {
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

// 清理文章描述中的 markdown 符号
function cleanMarkdown(text: string): string {
	return text
		.replace(/```[\s\S]*?```/g, '')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/#{1,6}\s+/g, '')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
		.replace(/\n{3,}/g, '\n')
		.trim();
}

// 渲染消息内容（处理链接）
function renderMessageContent(content: string): string {
	return content;
}

onMount(() => {
	loadSettings();

	// 获取 Pio 实例
	if (typeof window !== "undefined" && window.pioInstance) {
		pioInstance = window.pioInstance;
		// 欢迎消息
		setTimeout(() => {
			showPioMessage("你好呀！我是小晤，有什么可以帮你的吗？~", 3000);
		}, 500);
	}
});

onDestroy(() => {
	// 清理
});
</script>

<div class="chat-page-container flex flex-col h-full">
	<!-- 对话历史区域 -->
	<div class="messages-container flex-1 overflow-y-auto mb-4" bind:this={messagesContainer}>
		{#if messages.length === 0}
			<!-- 空状态提示 -->
			<div class="empty-state flex flex-col items-center justify-center h-full text-center py-12">
				<div class="text-6xl mb-4">👋</div>
				<h3 class="text-lg font-semibold text-90 mb-2">你好呀！</h3>
				<p class="text-50 text-sm">我是小晤，有什么可以帮你的吗？</p>
				<p class="text-40 text-xs mt-4">我可以帮你搜索和推荐博客文章哦～</p>
			</div>
		{:else}
			<!-- 消息列表 -->
			<div class="messages-list space-y-4 py-4">
				{#each messages.filter(m => m.role !== 'system') as message}
					<div class="message flex items-start gap-3" class:message-user={message.role === 'user'}>
						<!-- 头像 -->
						<div class="avatar flex-shrink-0">
							{#if message.role === 'assistant'}
								<div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm">
									唔
								</div>
							{:else}
								<div class="w-8 h-8 rounded-full bg-500 flex items-center justify-center text-white text-sm">
									你
								</div>
							{/if}
						</div>

						<!-- 消息内容 -->
						<div class="message-content flex-1 min-w-0">
							<div class="message-header flex items-center gap-2 mb-1">
								<span class="sender-name text-sm font-medium text-90">
									{#if message.role === 'assistant'}
										小晤
									{:else}
										你
									{/if}
								</span>
								<span class="timestamp text-xs text-40">
									{formatTime(message.timestamp)}
								</span>
							</div>
							<div class="message-body card-base px-4 py-3 rounded-xl" class:message-user={message.role === 'user'}>
								<div class="message-text text-sm text-90 whitespace-pre-wrap break-words">
									{renderMessageContent(message.content)}
								</div>
								{#if message.articles && message.articles.length > 0}
									<div class="article-recommendations mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
										<p class="text-xs text-gray-500 mb-2 font-medium">📚 推荐文章：</p>
										<div class="article-list space-y-2">
											{#each message.articles as article}
												<a href={article.url} class="article-card block p-3 rounded-lg border transition-all duration-200 no-underline">
													<div class="article-title text-sm font-medium mb-1">{article.title}</div>
													<div class="article-desc text-xs line-clamp-2">{cleanMarkdown(article.description)}</div>
												</a>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}

				<!-- 加载中状态 -->
				{#if isLoading}
					<div class="message flex items-start gap-3">
						<div class="avatar flex-shrink-0">
							<div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm">
								M
							</div>
						</div>
						<div class="message-content flex-1 min-w-0">
							<div class="message-header flex items-center gap-2 mb-1">
								<span class="sender-name text-sm font-medium text-90">小晤</span>
							</div>
							<div class="message-body card-base px-4 py-3 rounded-xl">
								<div class="flex items-center gap-2 text-50">
									<Icon icon="eosimgs:loading" class="w-4 h-4 animate-spin" />
									<span class="text-sm">思考中...</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- 输入框区域 -->
	<div class="chat-input-wrapper card-base p-4 rounded-xl">
		<div class="flex gap-2">
			<textarea
				bind:value={userInput}
				on:keydown={handleKeydown}
				placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
				class="flex-1 resize-none bg-(--btn-regular-bg) rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary) max-h-24 overflow-y-auto"
				rows="2"
				disabled={isLoading}
			></textarea>
			<button
				class="btn-regular w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
				class:opacity-50={isLoading || !userInput.trim()}
				class:cursor-not-allowed={isLoading || !userInput.trim()}
				on:click={sendMessage}
				disabled={isLoading || !userInput.trim()}
			>
				{#if isLoading}
					<Icon icon="eosimgs:loading" class="text-xl animate-spin" />
				{:else}
					<Icon icon="material-symbols:send" class="text-xl" />
				{/if}
			</button>
		</div>

		<!-- 操作栏 -->
		<div class="actions flex justify-end items-center mt-3 px-1">
			{#if messages.length > 0}
			<button
				class="btn-plain text-xs py-1 px-2 flex items-center gap-1"
				on:click={clearMessages}
			>
				<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
				清空记录
			</button>
			{/if}
		</div>
	</div>
</div>

<style>
.chat-page-container {
	min-height: 400px;
}

.chat-input-wrapper {
	background: var(--float-panel-bg);
}

.messages-container {
	max-height: 60vh;
}

/* 用户消息样式 */
.message.message-user {
	flex-direction: row-reverse;
}

.message.message-user .message-content {
	align-items: flex-end;
}

.message.message-user .message-header {
	justify-content: flex-end;
}

.message.message-user .message-body {
	background: var(--primary);
	color: white;
}

.message.message-user .message-text {
	color: white;
}

/* 消息动画 */
.message {
	animation: message-slide-in 0.3s ease-out;
}

@keyframes message-slide-in {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* 文章推荐卡片 */
.article-recommendations {
	border-top-color: var(--border-light);
}

.article-card {
	cursor: pointer;
	background: inherit;
	border-color: var(--border-light);
	transition: all 0.2s ease;
	filter: brightness(1);
}

.article-card:hover {
	filter: brightness(0.85);
	transform: translateX(4px);
	border-color: var(--primary);
}

.article-title {
	line-height: 1.4;
}

.article-desc {
	line-height: 1.5;
	color: var(--text-500);
}

.article-card:hover .article-desc {
	color: inherit;
}
</style>
