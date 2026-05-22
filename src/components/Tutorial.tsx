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
        回到大厅
      </button>
      <div className="tutorial-copy">
        <span className="eyebrow">
          <Brush size={18} />
          30 秒会玩
        </span>
        <h1>剪一小块，展开成大场面。</h1>
      </div>
      <div className="tutorial-steps">
        <div>
          <span>1</span>
          <h3>先选折法</h3>
          <p>二折像镜子，四折像窗花，六折和八折会把每一刀变成更离谱的重复结构。</p>
        </div>
        <div>
          <span>2</span>
          <h3>只剪局部</h3>
          <p>在折叠纸面上划线，线条会变成镂空剪口。可以放大画布微操，剪得越简洁，别人越可能猜出来。</p>
        </div>
        <div>
          <span>3</span>
          <h3>展开开盲盒</h3>
          <p>提交后系统展开红纸。开启吸附模式可以帮你自动闭合剪口，画线更丝滑～</p>
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
        开剪开剪
      </button>
    </section>
  );
}
