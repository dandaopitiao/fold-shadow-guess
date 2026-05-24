import { ArrowLeft, Brush, Check } from "lucide-react";
import { sound } from "../audio/sound-manager";

export function Tutorial({ onBack }: { onBack: () => void }) {
  return (
    <section className="tutorial">
      <button
        className="ghost-button back-button"
        onClick={() => {
          sound.click();
          onBack();
        }}
      >
        <ArrowLeft size={18} />
        逛逛大厅
      </button>
      <div className="tutorial-copy">
        <span className="eyebrow">
          <Brush size={18} />
          三秒上手
        </span>
        <h1>折一折，剪两刀，展开一个大惊喜。</h1>
      </div>
      <div className="tutorial-steps">
        <div>
          <span>1</span>
          <h3>先选折法</h3>
          <p>二折像照镜子左右对称，四折像窗花纹样，每一刀都会变成四份重复花纹。折得越多越惊喜～</p>
        </div>
        <div>
          <span>2</span>
          <h3>在折纸上画</h3>
          <p>用鼠标在折叠的红纸上画线，每一笔都会变成镂空的花纹。点放大镜可以精修细节，剪得简洁反而更好猜！</p>
        </div>
        <div>
          <span>3</span>
          <h3>展开看结果</h3>
          <p>点「展开看看」把纸铺开，你的花纹会按折法复制成完整剪纸。开着吸附模式画线更顺滑，Bot 们已经在盯着纸面了！</p>
        </div>
      </div>
      <button
        className="primary-button"
        onClick={() => {
          sound.click();
          onBack();
        }}
      >
        <Check size={20} />
        会了，去剪剪看
      </button>
    </section>
  );
}
