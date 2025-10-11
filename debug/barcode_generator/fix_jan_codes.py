#!/usr/bin/env python3
"""
JANコードのチェックディジットを修正するスクリプト
"""

import csv
from pathlib import Path


def calculate_ean13_check_digit(code: str) -> str:
    """
    EAN-13のチェックディジットを計算
    
    Args:
        code: 最初の12桁（チェックディジットなし）または13桁（チェックディジット付き）
    
    Returns:
        正しいチェックディジットを含む13桁のコード
    """
    # 最初の12桁のみを使用
    if len(code) == 13:
        code = code[:12]
    elif len(code) != 12:
        raise ValueError(f"Invalid code length: {len(code)}, expected 12 or 13")
    
    digits = [int(d) for d in code]
    
    # EAN-13の計算: 奇数位置×1 + 偶数位置×3
    odd_sum = sum(digits[i] for i in range(0, 12, 2))  # インデックス0,2,4,6,8,10
    even_sum = sum(digits[i] for i in range(1, 12, 2))  # インデックス1,3,5,7,9,11
    
    check_digit = (10 - ((odd_sum + even_sum * 3) % 10)) % 10
    
    return code + str(check_digit)


def main():
    script_dir = Path(__file__).parent
    input_csv = script_dir / "barcodes.csv"
    output_csv = script_dir / "barcodes_fixed.csv"
    
    print("JANコードのチェックディジットを修正します...")
    print(f"入力: {input_csv}")
    print(f"出力: {output_csv}")
    print()
    
    fixed_data = []
    
    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            product_name = row['商品名']
            original_code = row['JANコード']
            
            try:
                # チェックディジットを修正
                fixed_code = calculate_ean13_check_digit(original_code)
                
                if original_code != fixed_code:
                    print(f"修正: {product_name}")
                    print(f"  元: {original_code}")
                    print(f"  新: {fixed_code}")
                else:
                    print(f"OK  : {product_name} - {fixed_code}")
                
                fixed_data.append({
                    '商品名': product_name,
                    'JANコード元': original_code,
                    'JANコード修正後': fixed_code
                })
            except Exception as e:
                print(f"エラー: {product_name} - {e}")
    
    # 修正後のCSVを保存
    with open(output_csv, 'w', encoding='utf-8', newline='') as f:
        fieldnames = ['商品名', 'JANコード元', 'JANコード修正後']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(fixed_data)
    
    print()
    print(f"修正完了: {output_csv}")
    print()
    print("次のステップ:")
    print("1. barcodes_fixed.csv を確認")
    print("2. バックエンドのcreate_db.pyを更新")
    print("3. 新しいJANコードでバーコード画像を生成")


if __name__ == "__main__":
    main()
