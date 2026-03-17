<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount, createEventDispatcher } from "svelte";
import { fade, slide } from "svelte/transition";

const dispatch = createEventDispatcher();

// 组件状态
let isOpen = $state(false);
let isLoginMode = $state(true); // true = 登录，false = 注册
let isLoading = $state(false);
let errorMessage = $state("");
let successMessage = $state("");

// 表单数据
let email = $state("");
let password = $state("");
let confirmPassword = $state("");
let name = $state("");

// 用户登录状态
let isLoggedIn = $state(false);
let currentUser = $state<{ email: string; name: string } | null>(null);

// localStorage 键
const STORAGE_KEY_USER = "mizuki-auth-user";
const STORAGE_KEY_TOKEN = "mizuki-auth-token";

// 从 localStorage 加载用户状态
function loadAuthState() {
	try {
		if (typeof localStorage !== "undefined") {
			const savedUser = localStorage.getItem(STORAGE_KEY_USER);
			const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
			if (savedUser && savedToken) {
				currentUser = JSON.parse(savedUser);
				isLoggedIn = true;
			}
		}
	} catch (e) {
		console.warn("Failed to load auth state:", e);
	}
}

// 保存用户状态到 localStorage
function saveAuthState(user: typeof currentUser, token: string) {
	try {
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
			localStorage.setItem(STORAGE_KEY_TOKEN, token);
		}
	} catch (e) {
		console.warn("Failed to save auth state:", e);
	}
}

// 清除用户状态
function clearAuthState() {
	try {
		if (typeof localStorage !== "undefined") {
			localStorage.removeItem(STORAGE_KEY_USER);
			localStorage.removeItem(STORAGE_KEY_TOKEN);
		}
	} catch (e) {
		console.warn("Failed to clear auth state:", e);
	}
}

// 切换登录/注册模式
function toggleMode() {
	isLoginMode = !isLoginMode;
	errorMessage = "";
	successMessage = "";
}

// 关闭面板
function closePanel() {
	isOpen = false;
	errorMessage = "";
	successMessage = "";
}

// 登录
async function handleLogin() {
	if (!email || !password) {
		errorMessage = "请填写邮箱和密码";
		return;
	}

	isLoading = true;
	errorMessage = "";

	try {
		const response = await fetch("/api/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email,
				password,
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || data.error || "登录失败");
		}

		// 保存用户状态
		saveAuthState(data.user, data.token);
		isLoggedIn = true;
		currentUser = data.user;

		successMessage = "登录成功！";
		setTimeout(() => {
			closePanel();
			successMessage = "";
		}, 1500);
	} catch (error) {
		console.error("Login error:", error);
		errorMessage = error instanceof Error ? error.message : "登录失败，请检查网络";
	} finally {
		isLoading = false;
	}
}

// 注册
async function handleRegister() {
	if (!email || !password || !confirmPassword || !name) {
		errorMessage = "请填写所有字段";
		return;
	}

	if (password !== confirmPassword) {
		errorMessage = "两次输入的密码不一致";
		return;
	}

	if (password.length < 6) {
		errorMessage = "密码长度至少为 6 位";
		return;
	}

	isLoading = true;
	errorMessage = "";

	try {
		const response = await fetch("/api/auth/register", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email,
				password,
				name,
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || data.error || "注册失败");
		}

		// 保存用户状态
		saveAuthState(data.user, data.token);
		isLoggedIn = true;
		currentUser = data.user;

		successMessage = "注册成功！";
		setTimeout(() => {
			closePanel();
			successMessage = "";
		}, 1500);
	} catch (error) {
		console.error("Register error:", error);
		errorMessage = error instanceof Error ? error.message : "注册失败，请检查网络";
	} finally {
		isLoading = false;
	}
}

// 登出
function handleLogout() {
	clearAuthState();
	isLoggedIn = false;
	currentUser = null;
}

onMount(() => {
	loadAuthState();
});
</script>

<!-- 登录/注册按钮 - 放在导航栏中 -->
<button
	class="auth-btn btn-plain px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-(--btn-plain-bg-hover) transition-all"
	on:click={() => {
		if (isLoggedIn) {
			handleLogout();
		} else {
			isOpen = true;
		}
	}}
	title={isLoggedIn ? "退出登录" : "登录 / 注册"}
>
	{#if isLoggedIn}
		{#if currentUser?.role === 'ADMIN'}
			<a href="/admin" class="admin-link flex items-center gap-2" on:click|stopPropagation>
				<Icon icon="material-symbols:admin-panel-settings" class="text-xl" />
				<span class="text-sm font-medium">{currentUser?.name || currentUser?.email}</span>
			</a>
		{:else}
			<span class="text-sm font-medium">{currentUser?.name || currentUser?.email}</span>
		{/if}
		<Icon icon="material-symbols:logout" class="text-xl" />
	{:else}
		<Icon icon="material-symbols:login" class="text-xl" />
	{/if}
</button>

<!-- 登录/注册面板 - 页面中间弹出 -->
{#if !isLoggedIn}
<div
	class="auth-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/50"
	transition:fade={{ duration: 200 }}
	on:click={closePanel}
	class:opacity-0={!isOpen}
	class:pointer-events-none={!isOpen}
>
	<div
		class="auth-panel card-base bg-(--card-bg) shadow-2xl rounded-2xl w-full max-w-md mx-4 overflow-hidden"
		transition:slide={{ duration: 300, axis: 'y' }}
		on:click|stopPropagation
		class:opacity-0={!isOpen}
		class:scale-95={!isOpen}
		style="margin-top: 30vh;"
	>
		<!-- 头部 -->
		<div class="auth-header flex items-center justify-between p-4 border-b border-black/5 dark:border-white/10">
			<h3 class="font-semibold text-90 text-lg">{isLoginMode ? "用户登录" : "用户注册"}</h3>
			<button
				class="btn-plain w-8 h-8 rounded-lg flex items-center justify-center"
				on:click={closePanel}
			>
				<Icon icon="material-symbols:close" class="text-lg" />
			</button>
		</div>

		<!-- 表单 -->
		<div class="auth-form p-6 space-y-4">
			<!-- 姓名输入（仅注册模式） -->
			{#if !isLoginMode}
			<div>
				<label class="block text-sm font-medium text-90 mb-1">
					姓名
				</label>
				<input
					type="text"
					bind:value={name}
					class="w-full bg-(--btn-regular-bg) rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
					placeholder="您的姓名"
				/>
			</div>
			{/if}

			<!-- 邮箱输入 -->
			<div>
				<label class="block text-sm font-medium text-90 mb-1">
					邮箱
				</label>
				<input
					type="email"
					bind:value={email}
					class="w-full bg-(--btn-regular-bg) rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
					placeholder="your@email.com"
				/>
			</div>

			<!-- 密码输入 -->
			<div>
				<label class="block text-sm font-medium text-90 mb-1">
					密码
				</label>
				<input
					type="password"
					bind:value={password}
					class="w-full bg-(--btn-regular-bg) rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
					placeholder="至少 6 位密码"
				/>
			</div>

			<!-- 确认密码（仅注册模式） -->
			{#if !isLoginMode}
			<div>
				<label class="block text-sm font-medium text-90 mb-1">
					确认密码
				</label>
				<input
					type="password"
					bind:value={confirmPassword}
					class="w-full bg-(--btn-regular-bg) rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
					placeholder="再次输入密码"
				/>
			</div>
			{/if}

			<!-- 错误消息 -->
			{#if errorMessage}
			<div class="error-message flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
				<Icon icon="material-symbols:error" class="text-lg shrink-0" />
				<span>{errorMessage}</span>
			</div>
			{/if}

			<!-- 成功消息 -->
			{#if successMessage}
			<div class="success-message flex items-center gap-2 text-green-500 text-sm bg-green-500/10 p-3 rounded-lg">
				<Icon icon="material-symbols:check-circle" class="text-lg shrink-0" />
				<span>{successMessage}</span>
			</div>
			{/if}

			<!-- 提交按钮 -->
			<button
				class="btn-regular w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
				on:click={isLoginMode ? handleLogin : handleRegister}
				disabled={isLoading}
			>
				{#if isLoading}
					<Icon icon="eos-icons:loading" class="text-lg animate-spin" />
					<span>处理中...</span>
				{:else}
					<span>{isLoginMode ? "登录" : "注册"}</span>
				{/if}
			</button>

			<!-- 切换模式 -->
			<div class="text-center text-sm text-50 pt-2">
				{isLoginMode ? "还没有账号？" : "已有账号？"}
				<button
					class="text-(--primary) hover:underline ml-1 font-medium"
					on:click={toggleMode}
				>
					{isLoginMode ? "立即注册" : "立即登录"}
				</button>
			</div>
		</div>
	</div>
</div>
{/if}

<style>
.auth-overlay {
	backdrop-filter: blur(4px);
	-webkit-backdrop-filter: blur(4px);
}

.auth-panel {
	animation: panel-slide-up 0.3s ease-out;
}

@keyframes panel-slide-up {
	from {
		opacity: 0;
		transform: translateY(20px) scale(0.95);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

.admin-link {
	color: inherit;
	text-decoration: none;
}

.admin-link:hover {
	opacity: 0.8;
}
</style>
