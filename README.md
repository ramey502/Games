# Knockdown · 物理射击原型

Cocos Creator **3.8.8**，TypeScript，固定视角 3D。一个独立游戏工程，包含五个可直接玩的关卡。名称为开发代号。

## 开始试玩

在 Cocos Dashboard 导入 `games/knockdown`，打开 `assets/scenes/Main.scene`，点击预览。场景通过 `KnockdownGame` 在运行时创建，编辑视图中的空场景属于正常状态。

已经构建的 Web 版本可以在仓库根目录运行：

```sh
npm ci
npm run serve
# 浏览器打开 http://127.0.0.1:4173
```

鼠标或手指拖动瞄准、松开发射，也可以直接点击目标。将全部目标块击落台面即可过关。左下角可以直接选择五关，右下角重来、开关声音。最佳炮弹数保存在本地。无登录、广告或网络依赖。

## 构建与检查

```sh
npm test
npm run typecheck
npm run format:check
npm run build:web
npm run build:wechat
```

命令行构建调用真实 Creator 编译器；第一次构建需要编译引擎，后续复用缓存。默认识别 macOS 的 `/Applications/Cocos/Creator/3.8.8/CocosCreator.app`。其他安装位置设置 `COCOS_EDITOR_PATH`。类型检查读取已安装引擎的官方声明，不使用手写的 `cc` 替身。

输出位置：

- Web：`games/knockdown/build/web-mobile`
- 微信：`games/knockdown/build/wechatgame`

微信默认使用项目 AppID `wx6eb6655946c6e8c4`，配置保存在 `games/knockdown/build-wechat.json`。如需临时切换 AppID，可通过环境变量覆盖：

```sh
WECHAT_APP_ID=你的小游戏AppID npm run build:wechat
```

在微信开发者工具中导入生成的 `wechatgame` 目录。不要使用 Cocos 模板的默认 AppID 作为产品身份。仓库不保存密钥，也不会自动上传或发布。

## 工程边界

```text
games/knockdown/
  assets/scenes/Main.scene       引导场景，显式引用程序化材质依赖
  assets/scripts/core/           关卡、弹道、胜负状态；不依赖引擎
  assets/scripts/platform/       存档、生命周期、微信振动与安全区
  assets/scripts/view/           几何模型、材质、Canvas HUD
  assets/scripts/KnockdownGame.ts 输入、场景和物理编排
  assets/resources/audio/        原创合成音效
  settings/                     可版本管理的引擎配置
tools/                          构建、类型检查、本地服务器、物理验证
tests/                          规则和真实物理回归测试
```

每个资源的 `.meta` 必须随源文件提交，保留 UUID。`library`、`temp`、`profiles`、`build` 和依赖目录均不提交。新增游戏时再按实际重复内容提取共享包，当前没有空的公共框架或虚构后端。

## 五个关卡

| 关卡 | 结构重点 | 炮弹预算 | 挑战目标 |
| --- | --- | --- | --- |
| 支点 | 单支柱承重，拆支点引发连锁 | 4 | 2 |
| 失衡 | 双腿结构，从一侧改变重心 | 5 | 3 |
| 断桥 | 细桥墩与载货桥面 | 5 | 3 |
| 连锁 | 长条与横梁互相碰撞 | 5 | 3 |
| 破局 | 前框与后方支撑，判断攻击顺序 | 6 | 4 |

关卡定义在 `levels.ts`，参考射击点仅供自动测试，游戏运行不会读取答案，也不会脚本触发倒塌。

## 物理与手感

- 使用 Creator 内置 **Cannon 3D**；测试依赖锁定为引擎对应的 `@cocos/cannon@1.2.8`。
- 固定步长 1/120 秒，最多补算 6 步；球半径 0.28m，前向速度 23m/s，避免以过快的弹体穿过薄碰撞体。
- 真实刚体、质量和冲量参与倒塌。只有目标块穿过落台高度后才计数，静止、命中和摇晃本身不会加分。
- 瞄准优先命中可见目标表面；空处瞄准落在目标平面。弹道预览补偿重力，不额外要求玩家调力度。
- 最后一发打出后等待飞行、倒塌和静止确认，不能立即判负。
- 触摸取消不发射，切后台暂停物理，重来清理旧刚体和 HUD，通关后停止接收射击。
- 碰撞声限频，轻量震屏与后坐力，微信支持短振动。Web 无振动时正常降级。

## 验收范围

20 项自动检查覆盖五关的静置稳定性、参考解可通关、弹道抵达、射击冷却、重复计数和最后一发结算。其中物理容错检查包含 45 组静置时间与轻微瞄准偏差组合，并验证剩余炮弹足够补射。使用与运行时相同的物理库与参数，但这不能替代不同手机上的真机测试。

本地验收已完成 Creator 类型检查、Web 与微信本地构建，以及浏览器中的点击/拖动射击、射偏扣弹、弹尽失败、重试、切关、844×390 横屏和 708×847 窄窗口的布局与瞄准检查。微信构建产物约 3.36 MiB；已使用项目 AppID 导入微信开发者工具，在 iPhone 17 横屏模拟器中验证启动、射击、倒塌计数和第一关两发通关，并修正了原生胶囊遮挡 HUD 的问题。模拟器验证不等于真机验收。

首版目标为横屏微信小游戏与 Web。Web 使用等比适配；窄窗口保留完整画面。平台相关代码不依赖浏览器 DOM。上线前仍需用实际 AppID 在 Android/iOS 微信真机验证帧率、后台恢复、音频和触控；正式商业化、帐号、排行榜均未接入。
