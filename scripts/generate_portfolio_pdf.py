from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
OUT_FILE = OUT_DIR / "折影猜意_作品集PDF.pdf"

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("PortfolioCN", FONT_REGULAR))


def style(
    name,
    size=10.5,
    leading=None,
    color="#241A16",
    align=TA_LEFT,
    space_after=6,
):
    return ParagraphStyle(
        name=name,
        fontName="PortfolioCN",
        fontSize=size,
        leading=leading or size * 1.45,
        textColor=colors.HexColor(color),
        alignment=align,
        spaceAfter=space_after,
        wordWrap="CJK",
    )


S_TITLE = style("Title", 31, 39, "#B91722", TA_CENTER, 10)
S_SUBTITLE = style("Subtitle", 13, 19, "#5B322B", TA_CENTER, 14)
S_SECTION = style("Section", 18, 24, "#B91722", TA_LEFT, 10)
S_H3 = style("H3", 12.5, 17, "#3C2722", TA_LEFT, 5)
S_BODY = style("Body", 9.8, 14.5, "#2A211D", TA_LEFT, 7)
S_SMALL = style("Small", 8.7, 12.5, "#5B514C", TA_LEFT, 3)
S_TAG = style("Tag", 8.3, 11, "#FFFFFF", TA_CENTER, 0)
S_CENTER = style("Center", 10.5, 15, "#2A211D", TA_CENTER, 5)
S_QUOTE = style("Quote", 12, 17.5, "#4C2D24", TA_CENTER, 8)


def p(text, st=S_BODY):
    return Paragraph(text, st)


def bullet(text):
    return p(f"• {text}", S_BODY)


def tag(text, bg):
    table = Table([[p(text, S_TAG)]], colWidths=[34 * mm], rowHeights=[8 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOX", (0, 0), (-1, -1), 0, colors.HexColor(bg)),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]
        )
    )
    return table


def card(items, bg="#FFF8F2", border="#E9B9A9", pad=9):
    table = Table([[items]], colWidths=[None])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(bg)),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor(border)),
                ("LEFTPADDING", (0, 0), (-1, -1), pad),
                ("RIGHTPADDING", (0, 0), (-1, -1), pad),
                ("TOPPADDING", (0, 0), (-1, -1), pad),
                ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return table


def image(path, width_mm, caption=None):
    img = Image(str(path))
    img._restrictSize(width_mm * mm, 180 * mm)
    elems = [img]
    if caption:
        elems.append(Spacer(1, 3))
        elems.append(p(caption, S_SMALL))
    return elems


def screenshot_table(items, col_widths):
    rows = []
    for path, title, caption in items:
        img = Image(str(path))
        img._restrictSize(col_widths[0] - 6 * mm, 72 * mm)
        rows.append(
            [
                img,
                [
                    p(f"<b>{title}</b>", S_H3),
                    p(caption, S_BODY),
                ],
            ]
        )
    table = Table(rows, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LINEBELOW", (0, 0), (-1, -2), 0.5, colors.HexColor("#E8D3C7")),
            ]
        )
    )
    return table


def meta_table(rows):
    data = [[p(k, S_SMALL), p(v, S_BODY)] for k, v in rows]
    table = Table(data, colWidths=[30 * mm, 108 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#8A3C35")),
                ("LINEBELOW", (0, 0), (-1, -2), 0.35, colors.HexColor("#E9D8CF")),
            ]
        )
    )
    return table


def on_first_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#FFF2E5"))
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#B91722"))
    canvas.rect(0, A4[1] - 16 * mm, A4[0], 16 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#FFE0D2"))
    canvas.circle(18 * mm, A4[1] - 8 * mm, 2.5 * mm, fill=1, stroke=0)
    canvas.circle(A4[0] - 18 * mm, A4[1] - 8 * mm, 2.5 * mm, fill=1, stroke=0)
    canvas.restoreState()


def on_later_pages(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#E7CFC4"))
    canvas.setLineWidth(0.6)
    canvas.line(18 * mm, A4[1] - 18 * mm, A4[0] - 18 * mm, A4[1] - 18 * mm)
    canvas.setFont("PortfolioCN", 8.5)
    canvas.setFillColor(colors.HexColor("#8A7068"))
    canvas.drawString(18 * mm, 12 * mm, "《折影猜意》作品集 PDF")
    canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, f"{doc.page}")
    canvas.restoreState()


def build_story():
    shots = ROOT / "portfolio" / "screenshots"
    story = []

    story.append(Spacer(1, 18 * mm))
    story.append(p("折影猜意", S_TITLE))
    story.append(p("剪纸版“你画我猜”的 Web 多人竞猜游戏", S_SUBTITLE))
    story.append(
        p(
            "传统文化赛道 / Web 互动游戏 / 可试玩 MVP 原型",
            S_CENTER,
        )
    )
    story.append(Spacer(1, 5 * mm))
    tags = Table(
        [[tag("React", "#B91722"), tag("TypeScript", "#D95B43"), tag("Vite", "#3CA68A"), tag("剪纸机制", "#5F5CB8")]],
        colWidths=[36 * mm, 36 * mm, 36 * mm, 36 * mm],
        hAlign="CENTER",
    )
    story.append(tags)
    story.append(Spacer(1, 10 * mm))
    story.extend(image(shots / "01-lobby.png", 160, "游戏大厅与房间选择界面：以折法难度组织多人竞猜房间。"))
    story.append(Spacer(1, 8 * mm))
    story.append(
        card(
            [
                p(
                    "一句话介绍",
                    S_H3,
                ),
                p(
                    "《折影猜意》把“画图表达”替换成“折叠纸面上的剪裁表达”。玩家只能在局部纸面上剪出线条和洞口，系统展开后生成对称剪纸图案，其他玩家根据最终效果猜题。",
                    S_BODY,
                ),
            ],
            "#FFFFFF",
            "#DFA99C",
        )
    )
    story.append(PageBreak())

    story.append(p("01 项目概览", S_SECTION))
    story.append(
        card(
            [
                p(
                    "项目定位",
                    S_H3,
                ),
                p(
                    "这是一款面向黑客松和作品集展示的 Web 互动游戏原型。作品将中国剪纸里的折叠、镂空、展开和对称复现转化为可操作的核心玩法，使传统文化不只是画面风格，而是实际影响表达难度和游戏笑点的机制。",
                    S_BODY,
                ),
            ]
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(
        meta_table(
            [
                ("作品类型", "Web 互动游戏 / 多人竞猜 / 传统文化创意游戏"),
                ("核心机制", "玩家在折叠纸上剪裁局部形状，系统按折法展开成完整剪纸图案。"),
                ("目标体验", "让玩家在有限表达、展开反差和多人误读中产生轻松、有记忆点的社交体验。"),
                ("作品状态", "可试玩 MVP：已实现大厅、房间选择、剪纸编辑器、展开预览、猜题模拟和结算。"),
                ("技术栈", "React + TypeScript + Vite + 前端图形交互"),
            ]
        )
    )
    story.append(Spacer(1, 6 * mm))
    story.append(p("核心亮点", S_H3))
    for text in [
        "玩法限制来自剪纸本身：玩家不能直接画完整形象，只能剪局部。",
        "折法决定难度：二折、四折、六折、八折会产生不同的对称和抽象程度。",
        "展开效果天然有反差：局部剪裁展开后可能漂亮，也可能变得非常离谱。",
        "适合短时间展示：评审只看 PDF 也能理解概念、玩法、实现和成品状态。",
    ]:
        story.append(bullet(text))
    story.append(PageBreak())

    story.append(p("02 核心玩法", S_SECTION))
    story.append(p("单轮流程", S_H3))
    flow = [
        ["1", "系统抽取剪纸者，并给剪纸者一个具体题目。"],
        ["2", "其他玩家只能看到剪纸过程，看不到题目。"],
        ["3", "剪纸者在折叠纸面上使用剪刀工具剪出局部形状。"],
        ["4", "系统根据房间折法自动镜像或旋转展开。"],
        ["5", "猜题者提交答案，越早猜中得分越高。"],
        ["6", "回合结束后公布答案、作品和排行榜。"],
    ]
    flow_table = Table(
        [[p(step, S_CENTER), p(desc, S_BODY)] for step, desc in flow],
        colWidths=[14 * mm, 138 * mm],
    )
    flow_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#B91722")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
                ("BACKGROUND", (1, 0), (1, -1), colors.HexColor("#FFF8F2")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8C6B8")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E8C6B8")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(flow_table)
    story.append(Spacer(1, 7 * mm))
    story.append(p("房间难度", S_H3))
    room_rows = [
        ["小剪刀局", "二折", "左右镜像，适合新手快速理解。"],
        ["花花四折局", "四折", "上下左右展开，开始出现窗花感。"],
        ["旋转翻车局", "六折", "一刀转六份，表达更抽象。"],
        ["脑洞爆炸局", "八折", "对称重复最强，适合高手和搞笑场面。"],
    ]
    room_table = Table(
        [[p(a, S_BODY), p(b, S_BODY), p(c, S_BODY)] for a, b, c in room_rows],
        colWidths=[34 * mm, 24 * mm, 94 * mm],
    )
    room_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5DDD1")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8C6B8")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E8C6B8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(room_table)
    story.append(PageBreak())

    story.append(p("03 技术实现与个人贡献", S_SECTION))
    story.append(
        card(
            [
                p("实现重点", S_H3),
                bullet("用 React 组件管理大厅、教程、创作、结果等游戏阶段。"),
                bullet("用 TypeScript 类型约束玩家、题库、房间、剪裁路径和猜题记录。"),
                bullet("将每一刀记录为局部路径，再根据当前折法映射到展开后的多份图案。"),
                bullet("用前端状态模拟多人猜题、顺位得分和剪纸者反馈。"),
            ],
            "#FFFFFF",
            "#DFA99C",
        )
    )
    story.append(Spacer(1, 6 * mm))
    story.append(p("我在项目中完成的工作", S_H3))
    for text in [
        "从黑客松题目出发，设计“剪纸版你画我猜”的核心创意和玩法闭环。",
        "设计房间难度、题库、对局流程、计分规则和剪纸编辑器交互。",
        "完成 Web MVP 原型开发，让项目具备可运行、可截图、可演示的作品集状态。",
        "整理参赛方案、提交说明和可上传 PDF 作品集材料。",
    ]:
        story.append(bullet(text))
    story.append(Spacer(1, 6 * mm))
    story.append(p("为什么适合黑客松展示", S_H3))
    story.append(
        p(
            "作品同时具备文化主题、交互创新和可落地原型三部分。即使只提交 PDF，评审也可以从截图和流程中看到：它不是一个抽象点子，而是已经被做成前端游戏原型的完整作品。",
            S_BODY,
        )
    )
    story.append(Spacer(1, 7 * mm))
    story.extend(image(shots / "03-result.png", 150, "结果页：展示展开后的剪纸作品、正确答案、猜题反馈和得分。"))
    story.append(PageBreak())

    story.append(p("04 成品截图", S_SECTION))
    story.append(
        screenshot_table(
            [
                (
                    shots / "01-lobby.png",
                    "大厅与房间选择",
                    "玩家进入后选择不同折法难度的房间。房间不按主题分，而按剪纸折法分，直接服务于玩法难度。",
                ),
                (
                    shots / "02-drawing.png",
                    "剪纸创作过程",
                    "剪纸者在有限时间内用剪刀工具表达题目，猜题者根据过程和展开预览不断提交答案。",
                ),
                (
                    shots / "03-result.png",
                    "展开与结算",
                    "回合结束后展示完整剪纸图案、正确答案、猜中顺序和积分反馈。",
                ),
                (
                    shots / "04-mobile.png",
                    "移动端适配",
                    "界面支持窄屏浏览，方便作品集 PDF 和手机端预览场景中展示。",
                ),
            ],
            [62 * mm, 92 * mm],
        )
    )
    story.append(PageBreak())

    story.append(p("05 提交摘要", S_SECTION))
    story.append(
        card(
            [
                p("可直接复制到申请系统的摘要", S_H3),
                p(
                    "《折影猜意》是一款把“你画我猜”改造成“折纸剪纸竞猜”的 Web 游戏。玩家在折叠纸面上剪裁局部图案，系统自动按折法展开成完整对称剪纸，其他玩家根据最终效果猜出具体物体或场景。项目将传统剪纸的折叠和展开过程转化为核心玩法限制，形成兼具文化辨识度、社交趣味和原型完成度的黑客松作品。",
                    S_BODY,
                ),
            ],
            "#FFF8F2",
            "#DFA99C",
        )
    )
    story.append(Spacer(1, 7 * mm))
    story.append(
        meta_table(
            [
                ("作品名称", "折影猜意"),
                ("推荐赛道", "传统文化 / Web 游戏 / 创意互动"),
                ("作品形式", "可试玩 Web MVP 原型，本 PDF 为单文件作品集提交版。"),
                ("核心卖点", "剪纸机制即玩法机制，折叠限制和展开反差天然产生竞猜乐趣。"),
                ("技术关键词", "React, TypeScript, Vite, 图形交互, 游戏原型"),
            ]
        )
    )
    story.append(Spacer(1, 10 * mm))
    story.append(
        p(
            "材料版本：2026-05-22  ｜  输出文件：折影猜意_作品集PDF.pdf",
            S_SMALL,
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(
        p(
            "本 PDF 已包含项目说明、玩法流程、实现重点、个人贡献和成品截图，可作为黑客松申请系统中的单文件作品集材料。",
            S_QUOTE,
        )
    )

    return story


def main():
    register_fonts()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT_FILE),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title="折影猜意作品集PDF",
        author="Xiayu Zhai",
    )
    doc.build(build_story(), onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(OUT_FILE)


if __name__ == "__main__":
    main()
