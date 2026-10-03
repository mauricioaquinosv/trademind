from app.parsers.manual_template_parser import ManualTemplateParser

parser = ManualTemplateParser()
trades = parser.parse("sample_data/plantilla_trademind.xlsx")

print(f"Trades encontrados: {len(trades)}\n")
for t in trades:
    print(f"{t.symbol} {t.direction} qty={t.quantity} "
          f"entry={t.entry_price} exit={t.exit_price} "
          f"sl={t.sl} tp={t.tp} "
          f"entry_time={t.entry_time} exit_time={t.exit_time} "
          f"pnl_bruto={t.pnl_bruto} pnl_neto={round(t.pnl_neto, 2)}")