/**
 * 认证状态管理 Store
 * 提供统一的用户认证状态访问
 */

import { AUTH_USER_KEY, AUTH_TOKEN_KEY } from "../utils/constants";

// 用户类型
export interface AuthUser {
	email: string;
	name: string;
	role: string;
	id?: number;
	avatar?: string;
}

// 认证状态
export interface AuthState {
	user: AuthUser | null;
	token: string | null;
	isLoggedIn: boolean;
}

// 创建全局认证状态
const globalForAuth = globalThis as unknown as {
	authState: AuthState;
};

if (!globalForAuth.authState) {
	globalForAuth.authState = {
		user: null,
		token: null,
		isLoggedIn: false,
	};
}

// 从 localStorage 初始化
export function initAuthState(): AuthState {
	if (typeof localStorage === "undefined") {
		return globalForAuth.authState;
	}

	const savedUser = localStorage.getItem(AUTH_USER_KEY);
	const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);

	if (savedUser && savedToken) {
		try {
			globalForAuth.authState.user = JSON.parse(savedUser);
			globalForAuth.authState.token = savedToken;
			globalForAuth.authState.isLoggedIn = true;
		} catch (e) {
			console.warn("Failed to parse auth user:", e);
			clearAuthState();
		}
	}

	return globalForAuth.authState;
}

// 保存认证状态
export function saveAuthState(user: AuthUser, token: string): void {
	if (typeof localStorage === "undefined") return;

	globalForAuth.authState.user = user;
	globalForAuth.authState.token = token;
	globalForAuth.authState.isLoggedIn = true;

	localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
	localStorage.setItem(AUTH_TOKEN_KEY, token);
}

// 清除认证状态
export function clearAuthState(): void {
	if (typeof localStorage === "undefined") return;

	globalForAuth.authState.user = null;
	globalForAuth.authState.token = null;
	globalForAuth.authState.isLoggedIn = false;

	localStorage.removeItem(AUTH_USER_KEY);
	localStorage.removeItem(AUTH_TOKEN_KEY);
}

// 获取当前 token
export function getToken(): string | null {
	return globalForAuth.authState.token;
}

// 获取当前用户
export function getCurrentUser(): AuthUser | null {
	return globalForAuth.authState.user;
}

// 检查是否已登录
export function isLoggedIn(): boolean {
	return globalForAuth.authState.isLoggedIn;
}
