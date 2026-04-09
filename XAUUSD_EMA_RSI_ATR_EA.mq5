//+------------------------------------------------------------------+
//|                        XAUUSD_EMA_RSI_ATR_EA.mq5                |
//|                   Gold EMA/RSI/ATR Expert Advisor — M5           |
//|  Strategy : EMA(20/50) crossover filtered by RSI(14) + ATR(14)  |
//|  Managed  : CTrade class, trailing stop, daily/drawdown guards   |
//+------------------------------------------------------------------+
#property copyright "Tela ERP — Trading Module"
#property link      ""
#property version   "1.00"
#property description "XAUUSD M5 EA: EMA crossover + RSI neutral zone + ATR sizing"

#include <Trade\Trade.mqh>

//────────────────────────────────────────────────────────────────────
// INPUT PARAMETERS
//────────────────────────────────────────────────────────────────────
input group "═══ General ═══"
input bool   TradingEnabled          = true;    // Enable / disable all trading
input int    MagicNumber             = 202401;  // Unique EA identifier

input group "═══ Position Sizing ═══"
input double Lots                    = 0.01;    // Fixed lot size (micro lot)

input group "═══ Indicator Periods ═══"
input int    EMAFastPeriod           = 20;      // Fast EMA period
input int    EMASlowPeriod           = 50;      // Slow EMA period
input int    RSIPeriod               = 14;      // RSI period
input int    ATRPeriod               = 14;      // ATR period

input group "═══ Risk / Reward ═══"
input double SLMultiplier            = 1.5;     // Stop Loss  = SLMultiplier  × ATR
input double TPMultiplier            = 3.0;     // Take Profit = TPMultiplier × ATR
input double TrailActivateMultiplier = 1.0;     // Activate trailing stop at N × ATR profit
input double TrailDistanceMultiplier = 0.5;     // Trail distance = N × ATR

input group "═══ Trading Hours (server time) ═══"
input int    StartHour               = 8;       // Session start hour (inclusive)
input int    EndHour                 = 17;      // Session end   hour (exclusive)

input group "═══ Safety Limits ═══"
input double MaxDrawdownPercent      = 20.0;    // Max equity drawdown % before halt
input double DailyLossLimit          = 5.0;     // Max daily loss % before halt

//────────────────────────────────────────────────────────────────────
// GLOBAL STATE
//────────────────────────────────────────────────────────────────────
CTrade  trade;

// Indicator handles
int     handleEMAFast   = INVALID_HANDLE;
int     handleEMASlow   = INVALID_HANDLE;
int     handleRSI       = INVALID_HANDLE;
int     handleATR       = INVALID_HANDLE;

// Safety state
double  dailyStartBalance   = 0.0;
datetime lastDayChecked     = 0;
bool    drawdownHalted      = false;
bool    dailyHalted         = false;

// New-bar detection
datetime lastBarTime        = 0;

//────────────────────────────────────────────────────────────────────
// STRATEGY NAME (used in trade comments)
//────────────────────────────────────────────────────────────────────
#define EA_NAME "XAUUSD_EMA_RSI_ATR"

//+------------------------------------------------------------------+
//| Expert initialisation                                             |
//+------------------------------------------------------------------+
int OnInit()
  {
   // ── Validate basic inputs ─────────────────────────────────────
   if(EMAFastPeriod >= EMASlowPeriod)
     {
      Print("ERROR: EMAFastPeriod must be < EMASlowPeriod");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(Lots <= 0.0)
     {
      Print("ERROR: Lots must be > 0");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(StartHour < 0 || StartHour > 23 || EndHour < 0 || EndHour > 23)
     {
      Print("ERROR: StartHour and EndHour must be in [0, 23]");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(MaxDrawdownPercent <= 0.0 || MaxDrawdownPercent >= 100.0)
     {
      Print("ERROR: MaxDrawdownPercent must be in (0, 100)");
      return INIT_PARAMETERS_INCORRECT;
     }
   if(DailyLossLimit <= 0.0 || DailyLossLimit >= 100.0)
     {
      Print("ERROR: DailyLossLimit must be in (0, 100)");
      return INIT_PARAMETERS_INCORRECT;
     }

   // ── Create indicator handles ──────────────────────────────────
   handleEMAFast = iMA(_Symbol, _Period, EMAFastPeriod, 0, MODE_EMA, PRICE_CLOSE);
   handleEMASlow = iMA(_Symbol, _Period, EMASlowPeriod, 0, MODE_EMA, PRICE_CLOSE);
   handleRSI     = iRSI(_Symbol, _Period, RSIPeriod, PRICE_CLOSE);
   handleATR     = iATR(_Symbol, _Period, ATRPeriod);

   if(handleEMAFast == INVALID_HANDLE || handleEMASlow == INVALID_HANDLE ||
      handleRSI     == INVALID_HANDLE || handleATR     == INVALID_HANDLE)
     {
      Print("ERROR: Failed to create one or more indicator handles. Error: ", GetLastError());
      return INIT_FAILED;
     }

   // ── Configure CTrade ─────────────────────────────────────────
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(30);           // tolerance for Gold spreads
   trade.SetTypeFilling(ORDER_FILLING_IOC);

   // ── Seed daily balance tracker ───────────────────────────────
   dailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
   lastDayChecked    = TimeCurrent();
   drawdownHalted    = false;
   dailyHalted       = false;
   lastBarTime       = 0;

   Print(EA_NAME, " initialised on ", _Symbol, " ", EnumToString(_Period),
         " | Magic: ", MagicNumber,
         " | Lots: ", Lots,
         " | SL×ATR: ", SLMultiplier, " | TP×ATR: ", TPMultiplier);
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| Expert de-initialisation                                          |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   if(handleEMAFast != INVALID_HANDLE) { IndicatorRelease(handleEMAFast); handleEMAFast = INVALID_HANDLE; }
   if(handleEMASlow != INVALID_HANDLE) { IndicatorRelease(handleEMASlow); handleEMASlow = INVALID_HANDLE; }
   if(handleRSI     != INVALID_HANDLE) { IndicatorRelease(handleRSI);     handleRSI     = INVALID_HANDLE; }
   if(handleATR     != INVALID_HANDLE) { IndicatorRelease(handleATR);     handleATR     = INVALID_HANDLE; }
   Print(EA_NAME, " deinitialised. Reason: ", reason);
  }

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
  {
   // ── 1. Manual kill-switch ─────────────────────────────────────
   if(!TradingEnabled)
      return;

   // ── 2. Safety checks (every tick) ────────────────────────────
   if(!CheckSafetyLimits())
      return;  // halted — also handles trailing for open trades

   // ── 3. Manage trailing stop every tick ───────────────────────
   ManageTrailingStop();

   // ── 4. Only act on a new closed bar ──────────────────────────
   if(!IsNewBar())
      return;

   // ── 5. Trading-hours filter ───────────────────────────────────
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if(dt.hour < StartHour || dt.hour >= EndHour)
      return;

   // ── 6. Maximum one open trade ────────────────────────────────
   if(CountOpenPositions() >= 1)
      return;

   // ── 7. Fetch indicator values (shift = 1 → confirmed closed bar)
   //    We copy 2 bars so we can check the cross:
   //      index 0 = bar[1] (just closed)   ← signal bar
   //      index 1 = bar[2] (one before)    ← previous bar for cross confirmation
   double emaFast[2], emaSlow[2], rsi[1], atr[1];

   ArraySetAsSeries(emaFast, true);
   ArraySetAsSeries(emaSlow, true);
   ArraySetAsSeries(rsi,     true);
   ArraySetAsSeries(atr,     true);

   // CopyBuffer start=1 means we skip bar[0] (current forming bar)
   if(CopyBuffer(handleEMAFast, 0, 1, 2, emaFast) < 2) return;
   if(CopyBuffer(handleEMASlow, 0, 1, 2, emaSlow) < 2) return;
   if(CopyBuffer(handleRSI,     0, 1, 1, rsi)     < 1) return;
   if(CopyBuffer(handleATR,     0, 1, 1, atr)     < 1) return;

   // Layout:
   //   emaFast[0] = EMA fast at bar[1]  (just closed — signal bar)
   //   emaFast[1] = EMA fast at bar[2]  (previous bar)
   double fastNow  = emaFast[0];
   double fastPrev = emaFast[1];
   double slowNow  = emaSlow[0];
   double slowPrev = emaSlow[1];
   double rsiVal   = rsi[0];
   double atrVal   = atr[0];

   // ── 8. ATR filter ─────────────────────────────────────────────
   double atrPoints = atrVal / _Point;
   if(atrPoints < 50.0)
     {
      // Market too flat — skip
      return;
     }
   if(atrPoints > 500.0)
     {
      // Extreme volatility / news spike — skip
      return;
     }

   // ── 9. RSI extremes guard ─────────────────────────────────────
   if(rsiVal > 70.0 || rsiVal < 30.0)
      return;

   // ── 10. RSI neutral zone requirement ─────────────────────────
   bool rsiNeutral = (rsiVal >= 40.0 && rsiVal <= 60.0);
   if(!rsiNeutral)
      return;

   // ── 11. EMA cross detection on bar[1] ────────────────────────
   //    Bullish cross: fast was below slow on bar[2], now above on bar[1]
   bool bullCross = (fastNow > slowNow) && (fastPrev <= slowPrev);
   //    Bearish cross: fast was above slow on bar[2], now below on bar[1]
   bool bearCross = (fastNow < slowNow) && (fastPrev >= slowPrev);

   if(!bullCross && !bearCross)
      return;

   // ── 12. Calculate SL / TP ─────────────────────────────────────
   double slDistance = SLMultiplier * atrVal;
   double tpDistance = TPMultiplier * atrVal;

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   if(bullCross)
     {
      double sl = NormalizeDouble(ask - slDistance, _Digits);
      double tp = NormalizeDouble(ask + tpDistance, _Digits);
      OpenOrder(ORDER_TYPE_BUY, Lots, ask, sl, tp, EA_NAME + "_BUY");
     }
   else // bearCross
     {
      double sl = NormalizeDouble(bid + slDistance, _Digits);
      double tp = NormalizeDouble(bid - tpDistance, _Digits);
      OpenOrder(ORDER_TYPE_SELL, Lots, bid, sl, tp, EA_NAME + "_SELL");
     }
  }

//+------------------------------------------------------------------+
//| Open order with retry logic                                       |
//+------------------------------------------------------------------+
void OpenOrder(ENUM_ORDER_TYPE type, double lots, double price,
               double sl, double tp, string comment)
  {
   int    maxRetries = 3;
   bool   success    = false;
   uint   retcode    = 0;

   for(int attempt = 1; attempt <= maxRetries; attempt++)
     {
      if(type == ORDER_TYPE_BUY)
         success = trade.Buy(lots, _Symbol, price, sl, tp, comment);
      else
         success = trade.Sell(lots, _Symbol, price, sl, tp, comment);

      retcode = trade.ResultRetcode();

      if(success && retcode == TRADE_RETCODE_DONE)
        {
         ulong ticket = trade.ResultOrder();
         Print(EA_NAME, " | ORDER OPENED | ", EnumToString(type),
               " | Ticket: ", ticket,
               " | Price: ", DoubleToString(price, _Digits),
               " | SL: ",    DoubleToString(sl,    _Digits),
               " | TP: ",    DoubleToString(tp,    _Digits),
               " | Lots: ",  DoubleToString(lots, 2));
         return;
        }

      Print(EA_NAME, " | ORDER FAILED (attempt ", attempt, "/", maxRetries,
            ") | Type: ", EnumToString(type),
            " | Retcode: ", retcode,
            " | Desc: ",   trade.ResultRetcodeDescription());

      if(attempt < maxRetries)
         Sleep(500);
     }

   Print(EA_NAME, " | ORDER ABANDONED after ", maxRetries, " attempts. Last retcode: ", retcode);
  }

//+------------------------------------------------------------------+
//| Manage trailing stop for all EA positions                         |
//+------------------------------------------------------------------+
void ManageTrailingStop()
  {
   // Need current ATR for trail calculations
   double atr[1];
   ArraySetAsSeries(atr, true);
   if(CopyBuffer(handleATR, 0, 0, 1, atr) < 1)
      return;
   double atrVal = atr[0];

   double activateDist = TrailActivateMultiplier * atrVal;
   double trailDist    = TrailDistanceMultiplier * atrVal;

   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);

   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;

      ENUM_POSITION_TYPE posType  = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double             openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double             currentSL = PositionGetDouble(POSITION_SL);
      double             currentTP = PositionGetDouble(POSITION_TP);

      if(posType == POSITION_TYPE_BUY)
        {
         double profit = bid - openPrice;
         if(profit >= activateDist)
           {
            double newSL = NormalizeDouble(bid - trailDist, _Digits);
            // Only move SL upward
            if(newSL > currentSL + _Point)
              {
               if(trade.PositionModify(ticket, newSL, currentTP))
                  Print(EA_NAME, " | TRAIL SL MOVED (BUY)  | Ticket: ", ticket,
                        " | New SL: ", DoubleToString(newSL, _Digits));
               else
                  Print(EA_NAME, " | TRAIL SL FAIL  (BUY)  | Ticket: ", ticket,
                        " | Retcode: ", trade.ResultRetcode(),
                        " | ", trade.ResultRetcodeDescription());
              }
           }
        }
      else if(posType == POSITION_TYPE_SELL)
        {
         double profit = openPrice - ask;
         if(profit >= activateDist)
           {
            double newSL = NormalizeDouble(ask + trailDist, _Digits);
            // Only move SL downward
            if(newSL < currentSL - _Point || currentSL == 0.0)
              {
               if(trade.PositionModify(ticket, newSL, currentTP))
                  Print(EA_NAME, " | TRAIL SL MOVED (SELL) | Ticket: ", ticket,
                        " | New SL: ", DoubleToString(newSL, _Digits));
               else
                  Print(EA_NAME, " | TRAIL SL FAIL  (SELL) | Ticket: ", ticket,
                        " | Retcode: ", trade.ResultRetcode(),
                        " | ", trade.ResultRetcodeDescription());
              }
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| Safety checks — returns false if trading should be suppressed    |
//+------------------------------------------------------------------+
bool CheckSafetyLimits()
  {
   datetime now = TimeCurrent();
   MqlDateTime dtNow, dtLast;
   TimeToStruct(now,           dtNow);
   TimeToStruct(lastDayChecked, dtLast);

   // ── Daily reset ───────────────────────────────────────────────
   bool newDay = (dtNow.year != dtLast.year ||
                  dtNow.mon  != dtLast.mon  ||
                  dtNow.day  != dtLast.day);
   if(newDay)
     {
      dailyStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      lastDayChecked    = now;
      if(dailyHalted)
        {
         dailyHalted = false;
         Print(EA_NAME, " | New trading day — daily loss limit reset.");
        }
     }

   // ── Max drawdown check ────────────────────────────────────────
   if(!drawdownHalted)
     {
      double equity   = AccountInfoDouble(ACCOUNT_EQUITY);
      double balance  = AccountInfoDouble(ACCOUNT_BALANCE);
      double ddLimit  = balance * (1.0 - MaxDrawdownPercent / 100.0);
      if(equity < ddLimit)
        {
         drawdownHalted = true;
         CloseAllPositions();
         Print(EA_NAME, " | *** MAX DRAWDOWN REACHED ***",
               " | Equity: ",  DoubleToString(equity, 2),
               " | Limit: ",   DoubleToString(ddLimit, 2),
               " | Trading HALTED permanently. Remove EA and reload to reset.");
        }
     }
   if(drawdownHalted) return false;

   // ── Daily loss check ──────────────────────────────────────────
   if(!dailyHalted)
     {
      double equity       = AccountInfoDouble(ACCOUNT_EQUITY);
      double dailyLimit   = dailyStartBalance * (1.0 - DailyLossLimit / 100.0);
      if(equity < dailyLimit)
        {
         dailyHalted = true;
         CloseAllPositions();
         Print(EA_NAME, " | *** DAILY LOSS LIMIT REACHED ***",
               " | Equity: ",        DoubleToString(equity, 2),
               " | Day Start Bal: ", DoubleToString(dailyStartBalance, 2),
               " | Limit: ",         DoubleToString(dailyLimit, 2),
               " | Trading HALTED for today.");
        }
     }
   if(dailyHalted) return false;

   return true;
  }

//+------------------------------------------------------------------+
//| Close all open positions belonging to this EA                     |
//+------------------------------------------------------------------+
void CloseAllPositions()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;

      if(trade.PositionClose(ticket))
         Print(EA_NAME, " | POSITION CLOSED | Ticket: ", ticket,
               " | Reason: safety limit");
      else
         Print(EA_NAME, " | CLOSE FAILED | Ticket: ", ticket,
               " | Retcode: ", trade.ResultRetcode(),
               " | ", trade.ResultRetcodeDescription());
     }
  }

//+------------------------------------------------------------------+
//| Count open positions for this EA on this symbol                   |
//+------------------------------------------------------------------+
int CountOpenPositions()
  {
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;
      if(PositionGetInteger(POSITION_MAGIC) != MagicNumber) continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol) continue;
      count++;
     }
   return count;
  }

//+------------------------------------------------------------------+
//| Returns true once per new bar (M5 bar open)                       |
//+------------------------------------------------------------------+
bool IsNewBar()
  {
   datetime currentBarTime = iTime(_Symbol, _Period, 0);
   if(currentBarTime == lastBarTime)
      return false;
   lastBarTime = currentBarTime;
   return true;
  }
//+------------------------------------------------------------------+
