#!/usr/bin/env python3
"""
EAN-13バーコード画像を一括生成するスクリプト
標準準拠のバーコードを生成し、印刷に適した形式で出力
"""

import csv
import os
from pathlib import Path
from typing import List, Tuple

try:
    import barcode
    from barcode.writer import ImageWriter
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("必要なライブラリをインストールしています...")
    import subprocess
    subprocess.run(["pip", "install", "python-barcode", "pillow"], check=True)
    import barcode
    from barcode.writer import ImageWriter
    from PIL import Image, ImageDraw, ImageFont


def validate_ean13(code: str) -> bool:
    """EAN-13のチェックディジットを検証"""
    if len(code) != 13 or not code.isdigit():
        return False
    
    digits = [int(d) for d in code[:12]]
    odd_sum = sum(digits[i] for i in range(0, 12, 2))
    even_sum = sum(digits[i] for i in range(1, 12, 2))
    check_digit = (10 - ((odd_sum + even_sum * 3) % 10)) % 10
    
    return check_digit == int(code[12])


def generate_barcode(jan_code: str, product_name: str, output_dir: Path) -> Path:
    """
    標準準拠のEAN-13バーコード画像を生成
    
    Args:
        jan_code: JANコード（13桁）
        product_name: 商品名
        output_dir: 出力ディレクトリ
    
    Returns:
        生成された画像のパス
    """
    # チェックディジット検証
    if not validate_ean13(jan_code):
        raise ValueError(f"Invalid EAN-13 code: {jan_code}")
    
    # バーコード生成設定
    options = {
        'module_width': 0.4,  # バーの幅（mm）
        'module_height': 15.0,  # バーの高さ（mm）
        'quiet_zone': 6.5,  # 余白（mm）
        'font_size': 10,
        'text_distance': 5,
        'background': 'white',
        'foreground': 'black',
        'write_text': True,
        'dpi': 300,  # 高解像度で印刷品質を向上
    }
    
    # バーコード生成
    ean = barcode.get('ean13', jan_code, writer=ImageWriter())
    
    # ファイル名を安全な形式に変換
    safe_name = "".join(c if c.isalnum() or c in (' ', '_', '-') else '_' for c in product_name)
    filename = f"{safe_name}_{jan_code}"
    
    # バーコード画像を生成（拡張子なしで指定）
    barcode_path = output_dir / filename
    ean.save(str(barcode_path), options=options)
    
    # 生成されたファイルのパス（.pngが自動追加される）
    generated_path = Path(f"{barcode_path}.png")
    
    return generated_path


def create_printable_sheet(barcodes: List[Tuple[str, str, Path]], output_path: Path):
    """
    複数のバーコードを1枚の印刷用シートにまとめる
    
    Args:
        barcodes: (商品名, JANコード, 画像パス)のリスト
        output_path: 出力画像パス
    """
    # A4サイズ（210mm x 297mm）を300dpiで計算
    a4_width = int(210 * 300 / 25.4)  # 2480px
    a4_height = int(297 * 300 / 25.4)  # 3508px
    
    # 余白
    margin = 100
    spacing = 50
    
    # 白背景のシートを作成
    sheet = Image.new('RGB', (a4_width, a4_height), 'white')
    
    # バーコードを配置
    x, y = margin, margin
    max_height = 0
    
    for product_name, jan_code, barcode_path in barcodes:
        if not barcode_path.exists():
            print(f"Warning: {barcode_path} not found")
            continue
        
        # バーコード画像を読み込み
        barcode_img = Image.open(barcode_path)
        
        # 次の行に移動が必要かチェック
        if x + barcode_img.width + margin > a4_width:
            x = margin
            y += max_height + spacing
            max_height = 0
        
        # ページに収まらない場合は終了
        if y + barcode_img.height + margin > a4_height:
            print(f"Warning: Not enough space for all barcodes. Stopping at {product_name}")
            break
        
        # バーコードを貼り付け
        sheet.paste(barcode_img, (x, y))
        
        # 商品名を追加（日本語フォント対応）
        draw = ImageDraw.Draw(sheet)
        
        # 日本語フォントを試す（優先順位順）
        font = None
        font_paths = [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
            "/usr/share/fonts/truetype/takao-gothic/TakaoPGothic.ttf",
            "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
        ]
        
        for font_path in font_paths:
            try:
                # NotoSansCJK-Regular.ttcの場合はインデックス指定が必要
                if "NotoSansCJK" in font_path:
                    font = ImageFont.truetype(font_path, 18, index=0)  # index 0 = JP
                else:
                    font = ImageFont.truetype(font_path, 18)
                break
            except Exception as e:
                continue
        
        # フォントが見つからない場合はJANコードのみ表示
        if font is None:
            font = ImageFont.load_default()
            text_to_display = jan_code
        else:
            text_to_display = product_name
        
        text_y = y + barcode_img.height + 5
        draw.text((x, text_y), text_to_display, fill='black', font=font)
        
        # 次の位置を計算
        x += barcode_img.width + spacing
        max_height = max(max_height, barcode_img.height + 30)
    
    # シートを保存
    sheet.save(output_path, dpi=(300, 300))
    print(f"Printable sheet saved: {output_path}")


def main():
    """メイン処理"""
    script_dir = Path(__file__).parent
    csv_path = script_dir / "barcodes.csv"
    output_dir = script_dir / "output"
    
    # 出力ディレクトリを作成
    output_dir.mkdir(exist_ok=True)
    
    print("バーコード生成を開始します...")
    print(f"入力CSV: {csv_path}")
    print(f"出力先: {output_dir}")
    print()
    
    # CSVを読み込み
    barcodes = []
    success_count = 0
    error_count = 0
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            product_name = row['商品名']
            jan_code = row['JANコード']
            
            try:
                # バーコード生成
                barcode_path = generate_barcode(jan_code, product_name, output_dir)
                barcodes.append((product_name, jan_code, barcode_path))
                print(f"✓ {product_name}: {jan_code}")
                success_count += 1
            except Exception as e:
                print(f"✗ {product_name}: {jan_code} - Error: {e}")
                error_count += 1
    
    print()
    print(f"生成完了: {success_count}個成功, {error_count}個失敗")
    
    # 印刷用シートを作成
    if barcodes:
        print()
        print("印刷用シートを作成中...")
        sheet_path = output_dir / "printable_sheet.png"
        create_printable_sheet(barcodes, sheet_path)
        print()
        print("=" * 60)
        print("すべて完了しました！")
        print()
        print(f"個別バーコード: {output_dir}")
        print(f"印刷用シート: {sheet_path}")
        print()
        print("印刷手順:")
        print("1. printable_sheet.png を開く")
        print("2. A4用紙に印刷（推奨: カラー、高品質モード）")
        print("3. または、個別の画像をGoogleスプレッドシートに挿入")


if __name__ == "__main__":
    main()
