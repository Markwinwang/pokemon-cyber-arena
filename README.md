# Pokemon Cyber Arena

一个中文赛博朋克风的宝可梦互动站点，使用现代前端栈重构，覆盖前 50 位宝可梦，并加入了轻量卡牌对战玩法。

## 技术栈

- Next.js 16
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Three.js + React Three Fiber + Drei

## 功能

- 3D 全息主舞台：用 React Three Fiber 展示当前选中的宝可梦
- 图鉴探索：支持卡片、表格、进化链三种视图
- 搜索与筛选：支持按名称、编号、属性、种族值排序浏览
- 3v3 卡牌对战：玩家与 AI 各自组建 3 张牌，支持攻击、护盾、属性爆发
- 中文化数据：本地内置前 50 位宝可梦的中文资料与进化链

## 本地运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 生产构建

```bash
npm run build
npm run start
```
