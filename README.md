# 离线零售POS系统 (Offline Retail POS System)

纯前端实现的离线零售门店销售开单系统，基于 React + TypeScript + SQLite WASM + PWA。

## 功能特性

### 已实现功能
- **商品管理**: 新增、编辑、删除商品，支持图片上传和条码生成
- **销售开单**: 购物车管理、条码扫描、交易完成
- **交易记录**: 今日销售列表、营收统计
- **数据备份**: 支持导出/导入 SQLite 数据库文件
- **离线使用**: PWA 支持，可安装到主屏幕，离线可用

## 技术栈

- **前端框架**: React 18 + TypeScript 5
- **构建工具**: Vite 7
- **UI 样式**: Tailwind CSS
- **状态管理**: Zustand
- **数据库**: SQLite WASM
- **条码扫描**: @zxing/library
- **图标**: Lucide React

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

## 数据存储

系统使用 SQLite WASM 进行数据存储，按以下优先级尝试存储后端：

1. **OPFS** (Origin Private File System) - 大容量持久存储
2. **kvvfs** - IndexedDB backed 存储
3. **localStorage** - 本地存储
4. **内存** - 数据在刷新后丢失（后备方案）

**注意**: OPFS 需要浏览器支持并在特定条件下运行。如果 OPFS 不可用，系统会自动降级到其他存储方案。

## 浏览器兼容性

- Chrome/Edge 88+ (推荐)
- Firefox 79+
- Safari 15+

需要支持以下特性：
- WebAssembly
- ES2020+
- COOP/COEP 跨域隔离（开发服务器已配置）

## 已知限制

1. **OPFS 存储**: SQLite WASM 的 OPFS 支持在主线程中有限制，可能需要 Worker 支持才能完全正常工作
2. **条码扫描**: 相机扫描功能在 iOS PWA 模式下可能有权限限制
3. **数据导出/导入**: 在 iOS Safari 中可能受限

## 项目结构

```
src/
├── components/       # 通用组件
│   ├── BarcodeScanner.tsx   # 条码扫描器
│   ├── CartItem.tsx         # 购物车项目
│   └── ProductCard.tsx      # 商品卡片
├── pages/           # 页面组件
│   ├── Home.tsx     # 销售开单（首页）
│   ├── Products.tsx # 商品列表
│   ├── ProductForm.tsx      # 新增/编辑商品
│   ├── History.tsx  # 交易记录
│   └── Settings.tsx # 设置（数据导出/导入）
├── stores/          # Zustand 状态管理
│   ├── cartStore.ts
│   └── productStore.ts
├── db/              # 数据库层
│   ├── index.ts     # SQLite 初始化
│   ├── products.ts  # 商品表操作
│   └── transactions.ts      # 交易表操作
├── utils/           # 工具函数
│   ├── barcode.ts   # 条码生成
│   └── image.ts     # 图片压缩
└── types/           # TypeScript 类型
    └── index.ts
```

## 条码格式

系统自动生成 8 位店内条码：
- 格式：`2` + 7位随机数字
- 示例：`284736291`
- 首位为 `2`，避免与标准 EAN-13 条码冲突

## 开发计划

### MVP (当前版本)
- [x] 商品管理（含图片）
- [x] 销售开单
- [x] 交易记录
- [x] 数据导出/导入

### V1.1 (计划中)
- [ ] 整单折扣
- [ ] 商品促销
- [ ] 库存预警

### V1.2 (计划中)
- [ ] 采购/进货管理
- [ ] 简单进销存报表

### V2.0 (远期)
- [ ] 多设备同步
- [ ] 蓝牙打印支持

## 许可证

MIT
