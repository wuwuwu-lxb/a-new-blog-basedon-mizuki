<script lang="ts">
  import { onMount } from 'svelte';
  import Pio from './Pio.svelte';

  let verified = false;
  let showAnimation = false;
  let checkPassed = false;
  let pioLoaded = false;

  onMount(() => {
    // 检查 Pio 是否加载成功
    setTimeout(() => {
      if (!pioLoaded) {
        // Pio 没加载成功，保持默认状态
      }
    }, 3000);
  });

  function handleVerify() {
    if (checkPassed) return;
    checkPassed = true;
    verified = true;

    // 使用 localStorage 存储验证状态（24小时有效）
    localStorage.setItem('site_verified', 'true');
    localStorage.setItem('site_verified_t', Date.now().toString());

    // 1秒后开始动画
    setTimeout(() => {
      showAnimation = true;
      // 动画结束后跳转
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    }, 1000);
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="/pio/static/pio.css" />
</svelte:head>

<div class="verify-container" class:show-animation={showAnimation}>
  <!-- 背景 -->
  <div class="verify-bg"></div>

  <!-- 内容区域 -->
  <div class="verify-content">
    <!-- 标题 -->
    <div class="verify-header">
      <h1 class="verify-title">欢迎来到唔唔唔的冒险日记</h1>
      <p class="verify-subtitle">在开始探索之前，请完成验证</p>
    </div>

    <!-- 看板娘 -->
    <div class="verify-pio">
      <Pio mode="static" />
    </div>

    <!-- 验证按钮 -->
    {#if !verified}
      <div class="verify-actions">
        <button class="verify-btn" on:click={handleVerify}>
          <span class="verify-btn-icon">✓</span>
          我不是机器人
        </button>
      </div>
    {:else}
      <div class="verify-success">
        <p>验证成功！正在跳转...</p>
      </div>
    {/if}
  </div>

  <!-- 开屏动画覆盖层 -->
  {#if showAnimation}
    <div class="animation-overlay"></div>
  {/if}
</div>

<style>
  .verify-container {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    overflow: auto;
  }

  .verify-container.show-animation {
    animation: splashOut 1.5s ease-in-out forwards;
  }

  @keyframes splashOut {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
    100% {
      opacity: 0;
      transform: scale(2);
    }
  }

  .animation-overlay {
    position: absolute;
    inset: 0;
    background: white;
    animation: flashIn 0.3s ease-out forwards;
    pointer-events: none;
  }

  @keyframes flashIn {
    0% { opacity: 0; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }

  .verify-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 20% 80%, rgba(124, 58, 237, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.2) 0%, transparent 70%);
    animation: bgPulse 8s ease-in-out infinite;
  }

  @keyframes bgPulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  .verify-content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
  }

  .verify-header {
    text-align: center;
  }

  .verify-title {
    font-size: 2rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.5rem;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .verify-subtitle {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .verify-pio {
    width: 280px;
    height: 250px;
  }

  :global(.verify-pio .pio-container.static-mode) {
    position: relative !important;
    bottom: auto !important;
    left: auto !important;
    right: auto !important;
    z-index: auto !important;
    display: block !important;
  }

  .verify-actions {
    margin-top: 1rem;
  }

  .verify-btn {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    border: none;
    border-radius: 50px;
    cursor: pointer;
    box-shadow:
      0 4px 15px rgba(124, 58, 237, 0.4),
      0 0 30px rgba(124, 58, 237, 0.2);
    transition: all 0.3s ease;
  }

  .verify-btn:hover {
    transform: translateY(-2px);
    box-shadow:
      0 6px 20px rgba(124, 58, 237, 0.5),
      0 0 40px rgba(124, 58, 237, 0.3);
  }

  .verify-btn:active {
    transform: translateY(0);
  }

  .verify-btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    font-size: 0.9rem;
  }

  .verify-success {
    padding: 1rem 2rem;
    background: rgba(16, 185, 129, 0.2);
    border: 1px solid rgba(16, 185, 129, 0.5);
    border-radius: 12px;
    color: #34d399;
    font-weight: 500;
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* 响应式适配 */
  @media (max-width: 640px) {
    .verify-title {
      font-size: 1.5rem;
    }

    .verify-subtitle {
      font-size: 0.9rem;
    }

    .verify-pio {
      width: 220px;
      height: 200px;
    }

    .verify-btn {
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
    }
  }
</style>
