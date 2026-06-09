# OAuth Social Login Setup Guide

OAuth社交登录功能已完成实现，支持 Google 和 GitHub 登录。本文档说明如何配置和使用。

---

## ✅ 已实现功能

### 后端
- ✅ OAuth 认证端点 (`/api/v1/auth/oauth/{provider}`)
- ✅ OAuth 回调处理 (`/api/v1/auth/oauth/{provider}/callback`)
- ✅ Google OAuth 集成
- ✅ GitHub OAuth 集成
- ✅ 自动用户创建和关联
- ✅ Email 验证（OAuth 用户自动标记为已验证）
- ✅ JWT Token 生成和返回

### 前端
- ✅ OAuth 登录按钮（Google + GitHub）
- ✅ OAuth 回调页面 (`/auth/oauth-callback`)
- ✅ 自动 Token 存储和用户认证
- ✅ 三语支持（英语/中文/西班牙语）
- ✅ 重定向回原页面

---

## 🔧 配置步骤

### 1. Google OAuth 配置

#### 获取凭据
1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 创建新项目或选择现有项目
3. 启用 **Google+ API**
4. 创建 **OAuth 2.0 客户端 ID**
   - 应用类型：Web 应用
   - 授权重定向 URI：
     - 开发：`http://localhost:8000/api/v1/auth/oauth/google/callback`
     - 生产：`https://your-domain.com/api/v1/auth/oauth/google/callback`

#### 配置环境变量
```bash
# backend/.env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
```

---

### 2. GitHub OAuth 配置

#### 获取凭据
1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写信息：
   - Application name: `PDF-Flow`
   - Homepage URL: `http://localhost:5173` (开发) 或 `https://your-domain.com` (生产)
   - Authorization callback URL:
     - 开发：`http://localhost:8000/api/v1/auth/oauth/github/callback`
     - 生产：`https://your-domain.com/api/v1/auth/oauth/github/callback`

#### 配置环境变量
```bash
# backend/.env
GITHUB_CLIENT_ID=xxxxx
GITHUB_CLIENT_SECRET=xxxxx
```

---

### 3. 后端配置

#### 安装依赖
```bash
cd backend
pip install authlib==1.3.0
```

#### 环境变量
确保 `.env` 文件包含以下配置：
```bash
# OAuth
GOOGLE_CLIENT_ID=xxxxx
GOOGLE_CLIENT_SECRET=xxxxx
GITHUB_CLIENT_ID=xxxxx
GITHUB_CLIENT_SECRET=xxxxx
OAUTH_REDIRECT_URL=http://localhost:8000  # 后端基础 URL

# CORS（包含前端地址）
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### 启动后端
```bash
uvicorn app.main:app --reload
```

---

### 4. 前端配置

#### 环境变量
```bash
# .env（前端根目录）
VITE_API_URL=http://localhost:8000
```

#### 启动前端
```bash
npm run dev
```

---

## 📖 使用流程

### 用户登录流程

1. **用户点击 Google/GitHub 按钮**
   - 前端保存当前页面到 `sessionStorage`（用于登录后重定向）
   - 浏览器重定向到 `http://localhost:8000/api/v1/auth/oauth/{provider}`

2. **后端初始化 OAuth 流程**
   - 后端使用 Authlib 生成授权 URL
   - 重定向用户到 Google/GitHub 登录页面

3. **用户授权**
   - 用户在 Google/GitHub 页面登录并授权

4. **OAuth 提供商回调**
   - 提供商重定向到 `http://localhost:8000/api/v1/auth/oauth/{provider}/callback`
   - 后端验证授权码，获取 access token

5. **获取用户信息**
   - 后端调用提供商 API 获取用户信息（email, name, OAuth ID）

6. **创建或关联用户**
   - **情况 1**：OAuth ID 已存在 → 直接登录
   - **情况 2**：Email 已存在但未绑定 OAuth → 自动绑定
   - **情况 3**：全新用户 → 创建新账户

7. **返回 JWT Token**
   - 后端生成 access_token 和 refresh_token
   - 重定向到前端：`http://localhost:5173/auth/oauth-callback?access_token=xxx&refresh_token=xxx`

8. **前端处理回调**
   - 提取 URL 中的 token
   - 存储到 `localStorage`
   - 调用 `userStore.checkAuth()` 获取用户信息
   - 重定向到原页面或首页

---

## 🔐 安全特性

### 后端
- ✅ OAuth state 验证（由 Authlib 自动处理）
- ✅ CSRF 保护
- ✅ OAuth ID 唯一性校验
- ✅ Email 自动验证（OAuth 用户）
- ✅ 随机密码生成（OAuth 用户不使用密码登录）

### 前端
- ✅ Token 存储在 `localStorage`（HttpOnly cookie 更安全，但需后端配置）
- ✅ 自动 Token 刷新（401 时）
- ✅ HTTPS Only（生产环境）

---

## 🧪 测试

### 本地测试步骤

1. **启动后端**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. **启动前端**
   ```bash
   npm run dev
   ```

3. **测试 Google 登录**
   - 访问 `http://localhost:5173/auth/login`
   - 点击 "Google" 按钮
   - 使用测试 Google 账号登录
   - 验证是否成功重定向并显示用户信息

4. **测试 GitHub 登录**
   - 点击 "GitHub" 按钮
   - 授权应用
   - 验证登录成功

5. **测试账户关联**
   - 用 email/password 注册账号 `test@example.com`
   - 登出
   - 使用同一 email 的 Google 账号登录
   - 验证账户是否自动关联（不会创建重复用户）

---

## 🐛 常见问题

### 1. "OAuth is not configured" 错误
**原因**：环境变量未设置或后端未重启

**解决**：
```bash
# 检查 .env 文件
cat backend/.env | grep GOOGLE
cat backend/.env | grep GITHUB

# 重启后端
uvicorn app.main:app --reload
```

---

### 2. 重定向 URI 不匹配
**错误信息**：`redirect_uri_mismatch`

**解决**：
- Google：确保 Google Cloud Console 中的"授权重定向 URI"完全匹配
  - 开发：`http://localhost:8000/api/v1/auth/oauth/google/callback`
  - 生产：`https://your-domain.com/api/v1/auth/oauth/google/callback`
- GitHub：同样检查 OAuth App 设置

---

### 3. CORS 错误
**错误信息**：`Access-Control-Allow-Origin`

**解决**：
```bash
# backend/.env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

### 4. GitHub 无法获取 Email
**原因**：用户设置为"Keep my email addresses private"

**解决**：代码已处理，会尝试从 `/user/emails` 端点获取主要邮箱

---

## 🚀 生产部署

### 1. 更新 OAuth 回调 URL
- Google Console：添加生产 URL
- GitHub App：更新 Authorization callback URL

### 2. 环境变量
```bash
# 生产环境 .env
ENVIRONMENT=production
DEBUG=False
OAUTH_REDIRECT_URL=https://api.your-domain.com
ALLOWED_ORIGINS=https://your-domain.com
```

### 3. HTTPS Only
- 确保前后端都使用 HTTPS
- OAuth 提供商不接受 HTTP 回调（除了 localhost）

---

## 📊 数据库字段

### User 表（已有字段）
```python
oauth_provider = Column(String, nullable=True)  # 'google' 或 'github'
oauth_id = Column(String, nullable=True)        # OAuth 提供商返回的用户 ID
is_verified = Column(Boolean, default=False)    # OAuth 用户自动设为 True
```

### 索引
```python
Index('idx_oauth', 'oauth_provider', 'oauth_id')  # 快速查找 OAuth 用户
```

---

## 📝 API 端点

### 1. 初始化 OAuth 流程
```http
GET /api/v1/auth/oauth/{provider}
```
- **provider**: `google` | `github`
- **响应**：重定向到提供商登录页面

---

### 2. OAuth 回调
```http
GET /api/v1/auth/oauth/{provider}/callback
```
- 由 OAuth 提供商调用
- 验证授权码
- 创建/关联用户
- 返回 JWT token（重定向到前端）

---

### 3. 关联 OAuth（未来功能）
```http
POST /api/v1/auth/oauth/link/{provider}
GET /api/v1/auth/oauth/link/{provider}/callback
```
- 需要用户已登录
- 将 OAuth 账号绑定到现有账户

---

## ✅ 完成清单

- [x] 后端 OAuth 端点实现
- [x] Google OAuth 集成
- [x] GitHub OAuth 集成
- [x] 前端 OAuth 按钮
- [x] OAuth 回调页面
- [x] 用户创建和关联逻辑
- [x] Email 自动验证
- [x] JWT Token 返回
- [x] 三语国际化
- [x] 前端构建验证
- [x] 文档编写
- [ ] 本地测试（需配置 OAuth credentials）
- [ ] 生产部署

---

## 🎯 下一步

1. **获取 OAuth 凭据**：按照上述步骤获取 Google 和 GitHub 的客户端 ID/Secret
2. **本地测试**：验证完整流程
3. **错误处理优化**：添加更详细的错误日志
4. **账户绑定功能**：允许已登录用户绑定 OAuth
5. **OAuth 解绑**：允许用户解除 OAuth 绑定

---

*文档更新日期：2026-06-09*
