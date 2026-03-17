<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import { slide, fade } from "svelte/transition";

// 从配置中导入 Pio 实例引用
let pioInstance: any = null;

// 聊天窗口状态
let isChatOpen = $state(false);
let isMinimized = $state(false);
let isLoading = $state(false);
let showSettings = $state(false);

// 消息列表
interface Message {
	id: number;
	role: "user" | "assistant" | "system";
	content: string;
	timestamp: Date;
}

let messages = $state<Message[]>([]);
let userInput = $state("");
let autoScroll = $state(true);

// 系统提示词配置
let systemPrompt = $state("你是一个友好、博学的助手，名字叫小晤。请用简洁、温暖的语气回答问题。");
let apiEndpoint = $state("/api/chat");

// localStorage 键
const STORAGE_KEY_MESSAGES = "webchat-messages";
const STORAGE_KEY_SYSTEM_PROMPT = "webchat-system-prompt";

// 从 localStorage 加载配置
function loadSettings() {
	try {
		if (typeof localStorage !== "undefined") {
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

// 格式化时间
function formatTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "刚刚";
	if (minutes < 60) return `${minutes} 分钟前`;
	if (hours < 24) return `${hours} 小时前`;
	if (days < 7) return `${days} 天前`;

	return date.toLocaleDateString("zh-CN", {
		month: "short",
		day: "numeric",
	});
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
		};

		messages.push(assistantMessage);

		// 通过看板娘显示回复
		showPioMessage(assistantMessage.content, 5000);

		saveMessages();
	} catch (error) {
		console.error("Chat error:", error);

		// 显示错误消息
		const errorMessage: Message = {
			id: Date.now() + 1,
			role: "assistant",
			content: "抱歉，连接失败了，请检查网络设置。",
			timestamp: new Date(),
		};
		messages.push(errorMessage);
		showPioMessage("出错了...请检查网络设置", 3000);
		saveMessages();
	} finally {
		isLoading = false;
	}
}

// 通过 Pio 显示消息
function showPioMessage(text: string, duration: number = 3000) {
	// 尝试获取全局 Pio 实例
	if (typeof window !== "undefined" && (window as any).pioInstance) {
		(window as any).pioInstance.message(text, { time: duration });
	}
}

// 清除聊天记录
function clearMessages() {
	messages = [];
	saveMessages();
	showPioMessage("聊天记录已清空~", 2000);
}

// 打开设置面板
function toggleSettings() {
	showSettings = !showSettings;
}

// 保存设置
function saveSettings() {
	localStorage.setItem(STORAGE_KEY_SYSTEM_PROMPT, systemPrompt);
	showPioMessage("设置已保存~", 2000);
	showSettings = false;
}

// 键盘事件处理
function handleKeydown(event: KeyboardEvent) {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		sendMessage();
	}
}

// 自动滚动到底部
function scrollToBottom() {
	if (autoScroll) {
		const container = document.getElementById("chat-messages");
		if (container) {
			container.scrollTop = container.scrollHeight;
		}
	}
}

onMount(() => {
	loadSettings();

	// 尝试获取 Pio 实例并绑定点击事件
	if (typeof window !== "undefined") {
		const bindPioClick = () => {
			const pioCanvas = document.getElementById("pio");
			if (pioCanvas) {
				pioCanvas.addEventListener("click", () => {
					isChatOpen = true;
					isMinimized = false;
					// 通过看板娘显示欢迎消息
					setTimeout(() => {
						if ((window as any).pioInstance) {
							(window as any).pioInstance.message("你好呀！有什么可以帮你的吗？~", 3000);
						}
					}, 500);
				});
				console.log("WebChat: Pio click bound");
			} else {
				// Pio 还未加载，稍后重试
				setTimeout(bindPioClick, 500);
			}
		};

		bindPioClick();
	}
});

onDestroy(() => {
	// 清理
});
</script>

<!-- 聊天窗口 - 点击看板娘触发 -->
<div
	class="webchat-window fixed bottom-20 right-4 z-50 card-base bg-(--float-panel-bg) shadow-xl rounded-2xl transition-all duration-500 ease-in-out"
	class:open={isChatOpen && !isMinimized}
	class:opacity-0={!isChatOpen || isMinimized}
	class:scale-95={!isChatOpen || isMinimized}
	class:pointer-events-none={!isChatOpen || isMinimized}
>
	<!-- 头部 -->
	<div class="chat-header flex items-center justify-between p-4 border-b border-black/5 dark:border-white/10">
			<div class="flex items-center gap-3">
				<div class="avatar w-10 h-10 rounded-full bg-(--primary) flex items-center justify-center">
					<Icon icon="material-symbols:chat" class="text-white text-xl" />
				</div>
				<div>
					<div class="font-semibold text-90">小晤 Chat</div>
					<div class="text-xs text-50 flex items-center gap-1">
						<span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
						在线
					</div>
				</div>
			</div>
			<div class="flex items-center gap-1">
				<button
					class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
					on:click={toggleSettings}
					title="设置"
				>
					<Icon icon="material-symbols:settings" class="text-lg" />
				</button>
				<button
					class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
					on:click={() => { isMinimized = true; }}
					title="最小化"
				>
					<Icon icon="material-symbols:remove" class="text-lg" />
				</button>
				<button
					class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
					on:click={() => {
						isChatOpen = false;
						// 关闭时通过看板娘显示消息
						setTimeout(() => {
							if ((window as any).pioInstance) {
								(window as any).pioInstance.message("下次再见哦~", 2000);
							}
						}, 300);
					}}
					title="关闭"
				>
					<Icon icon="material-symbols:close" class="text-lg" />
				</button>
			</div>
		</div>

		<!-- 消息列表 -->
		<div
			id="chat-messages"
			class="chat-messages p-4 h-80 overflow-y-auto space-y-3"
			on:scroll={() => {
				const el = document.getElementById("chat-messages");
				if (el) {
					autoScroll = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
				}
			}}
		>
			{#if messages.length === 0}
				<div class="empty-state flex flex-col items-center justify-center h-full text-50">
					<Icon icon="material-symbols:chat-outline" class="text-5xl mb-3" />
					<p>开始和小晤聊天吧~</p>
					<p class="text-xs mt-2">问问关于这个网站或者技术问题</p>
				</div>
			{:else}
				{#each messages as message (message.id)}
					<div
						class="message flex gap-2"
						class:user={message.role === "user"}
						class:assistant={message.role === "assistant"}
					>
						{#if message.role === "assistant"}
							<div class="avatar w-8 h-8 rounded-full bg-(--primary) flex items-center justify-center shrink-0">
								<Icon icon="material-symbols:smart-toy" class="text-white text-sm" />
							</div>
						{/if}
						<div class="content max-w-[70%]">
							<div
								class="bubble p-3 rounded-2xl text-sm"
								class:bg-(--primary)={message.role === 'user'}
								class:text-white={message.role === 'user'}
								class:bg-(--btn-regular-bg)={message.role !== 'user'}
							>
								{message.content}
							</div>
							<div class="time text-xs text-30 mt-1 px-1">
								{formatTime(message.timestamp)}
							</div>
						</div>
						{#if message.role === "user"}
							<div class="avatar w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
								<Icon icon="material-symbols:person" class="text-white text-sm" />
							</div>
						{/if}
					</div>
				{/each}
				{#if isLoading}
					<div class="message flex gap-2 assistant">
						<div class="avatar w-8 h-8 rounded-full bg-(--primary) flex items-center justify-center shrink-0">
							<Icon icon="material-symbols:smart-toy" class="text-white text-sm" />
						</div>
						<div class="content max-w-[70%]">
							<div class="bubble p-3 rounded-2xl text-sm bg-(--btn-regular-bg)">
								<div class="flex gap-1">
									<span class="w-2 h-2 rounded-full bg-(--primary) animate-bounce" style="animation-delay: 0ms;"></span>
									<span class="w-2 h-2 rounded-full bg-(--primary) animate-bounce" style="animation-delay: 150ms;"></span>
									<span class="w-2 h-2 rounded-full bg-(--primary) animate-bounce" style="animation-delay: 300ms;"></span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- 输入框 -->
		<div class="chat-input p-3 border-t border-black/5 dark:border-white/10">
			<div class="flex gap-2">
				<textarea
					bind:value={userInput}
					on:keydown={handleKeydown}
					placeholder="输入消息... (Enter 发送)"
					class="flex-1 resize-none bg-(--btn-regular-bg) rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary) max-h-24 overflow-y-auto"
					rows="1"
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
			<div class="actions flex justify-between items-center mt-2 px-1">
				<div class="flex gap-1">
					<button
						class="btn-plain text-xs py-1 px-2"
						on:click={clearMessages}
						title="清空聊天记录"
					>
						<Icon icon="material-symbols:delete-outline" class="w-4 h-4" />
					</button>
				</div>
				<div class="text-xs text-30">
					按 Enter 发送
				</div>
			</div>
		</div>

		<!-- 设置面板 -->
		{#if showSettings}
		<div
			class="settings-panel absolute bottom-full right-0 mb-2 w-72 card-base shadow-xl rounded-xl p-4 z-50"
			transition:slide={{ duration: 200 }}
		>
			<div class="flex justify-between items-center mb-3">
				<h3 class="font-semibold text-90">聊天设置</h3>
				<button
					class="btn-plain w-6 h-6 rounded-lg"
					on:click={() => { showSettings = false; }}
				>
					<Icon icon="material-symbols:close" class="text-sm" />
				</button>
			</div>

			<div class="space-y-3">
				<div>
					<label class="block text-sm font-medium text-90 mb-1">
						系统提示词
					</label>
					<textarea
						bind:value={systemPrompt}
						class="w-full resize-none bg-(--btn-regular-bg) rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
						rows="4"
						placeholder="设置 AI 助手的角色和回复风格..."
					></textarea>
				</div>

				<div>
					<label class="block text-sm font-medium text-90 mb-1">
						API 端点
					</label>
					<input
						type="text"
						bind:value={apiEndpoint}
						class="w-full bg-(--btn-regular-bg) rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
						placeholder="/api/chat"
					/>
				</div>

				<button
					class="btn-regular w-full py-2 rounded-lg text-sm font-medium"
					on:click={saveSettings}
				>
					保存设置
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
.webchat-window {
	bottom: 5rem;
	right: 1rem;
	width: 22rem;
	max-width: calc(100vw - 2rem);
}

.chat-messages {
	scrollbar-width: thin;
}

.chat-messages::-webkit-scrollbar {
	width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
	background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
	background: var(--btn-regular-bg);
	border-radius: 3px;
}

.message.user {
	flex-direction: row-reverse;
}

.message.user .content {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}

.message.user .time {
	text-align: right;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}

.animate-spin {
	animation: spin 1s linear infinite;
}

/* 移动端适配 */
@media (max-width: 768px) {
	.webchat-window {
		bottom: 4.5rem;
		right: 0.5rem;
		left: 0.5rem;
		width: auto !important;
		max-width: none;
	}
}
</style>
