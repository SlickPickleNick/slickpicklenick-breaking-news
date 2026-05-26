using System;
using System.Collections.Generic;
using Newtonsoft.Json;

public class CPHInline
{
    private const string OverlayName = "breaking-news";
    private const string Version = "1.0.0";

    public bool Execute()
    {
        string action = GetStringArg("bnAction", GetStringArg("action", "queue")).Trim().ToLowerInvariant();
        string headline = GetStringArg("headline", GetStringArg("bnHeadline", ""));
        string subtitle = GetStringArg("subtitle", GetStringArg("bnSubtitle", ""));
        string label = GetStringArg("label", GetStringArg("bnLabel", ""));
        int durationSeconds = GetIntArg("durationSeconds", GetIntArg("bnDuration", -1));

        Dictionary<string, object> overrides = BuildOverridesFromArgs();

        switch (action)
        {
            case "show":
                ShowBreakingNews(headline, subtitle, durationSeconds, label, overrides);
                break;

            case "force":
            case "replace":
                ForceBreakingNews(headline, subtitle, durationSeconds, label, overrides);
                break;

            case "update":
                UpdateBreakingNews(headline, subtitle, durationSeconds, label, overrides);
                break;

            case "hide":
                HideBreakingNews();
                break;

            case "clear":
            case "clearqueue":
                ClearBreakingNewsQueue();
                break;

            case "clearandhide":
            case "reset":
                ClearAndHideBreakingNews();
                break;

            case "theme":
            case "settings":
            case "sync":
                SetBreakingNewsSettings(overrides);
                break;

            case "speed":
                SetBreakingNewsSpeed(GetIntArg("scrollSpeed", GetIntArg("bnScrollSpeed", 210)));
                break;

            case "test":
                QueueBreakingNews(
                    string.IsNullOrWhiteSpace(headline) ? "This is a test breaking news headline from Streamer.bot." : headline,
                    string.IsNullOrWhiteSpace(subtitle) ? "STREAM UPDATE" : subtitle,
                    durationSeconds < 0 ? 12 : durationSeconds,
                    label,
                    overrides
                );
                break;

            case "queue":
            default:
                QueueBreakingNews(headline, subtitle, durationSeconds, label, overrides);
                break;
        }

        return true;
    }

    public void QueueBreakingNews(string headline, string subtitle = "", int durationSeconds = -1, string label = "", Dictionary<string, object> overrides = null)
    {
        SendBreakingNewsCommand("queue", headline, subtitle, durationSeconds, label, overrides);
    }

    public void ShowBreakingNews(string headline, string subtitle = "", int durationSeconds = -1, string label = "", Dictionary<string, object> overrides = null)
    {
        SendBreakingNewsCommand("show", headline, subtitle, durationSeconds, label, overrides);
    }

    public void ForceBreakingNews(string headline, string subtitle = "", int durationSeconds = -1, string label = "", Dictionary<string, object> overrides = null)
    {
        SendBreakingNewsCommand("force", headline, subtitle, durationSeconds, label, overrides);
    }

    public void UpdateBreakingNews(string headline = "", string subtitle = "", int durationSeconds = -1, string label = "", Dictionary<string, object> overrides = null)
    {
        SendBreakingNewsCommand("update", headline, subtitle, durationSeconds, label, overrides);
    }

    public void HideBreakingNews()
    {
        SendBreakingNewsCommand("hide");
    }

    public void ClearBreakingNewsQueue()
    {
        SendBreakingNewsCommand("clear");
    }

    public void ClearAndHideBreakingNews()
    {
        SendBreakingNewsCommand("clearAndHide");
    }

    public void SetBreakingNewsSettings(Dictionary<string, object> overrides)
    {
        SendBreakingNewsCommand("settings", overrides: overrides ?? new Dictionary<string, object>());
    }

    public void SetBreakingNewsSpeed(int scrollSpeed)
    {
        var overrides = new Dictionary<string, object>
        {
            { "scrollSpeed", scrollSpeed }
        };

        SendBreakingNewsCommand("settings", overrides: overrides);
    }

    public void SyncBreakingNewsOverlay()
    {
        SendBreakingNewsCommand("sync", overrides: BuildOverridesFromArgs());
    }

    private void SendBreakingNewsCommand(
        string action,
        string headline = "",
        string subtitle = "",
        int durationSeconds = -1,
        string label = "",
        Dictionary<string, object> overrides = null
    )
    {
        var payload = new Dictionary<string, object>
        {
            { "overlay", OverlayName },
            { "type", "BREAKING_NEWS" },
            { "version", Version },
            { "action", action },
            { "sentAt", DateTime.UtcNow.ToString("o") }
        };

        if (!string.IsNullOrWhiteSpace(headline)) payload["headline"] = headline;
        if (!string.IsNullOrWhiteSpace(subtitle)) payload["subtitle"] = subtitle;
        if (!string.IsNullOrWhiteSpace(label)) payload["label"] = label;
        if (durationSeconds >= 0) payload["durationSeconds"] = durationSeconds;
        if (overrides != null && overrides.Count > 0) payload["overrides"] = overrides;

        string json = JsonConvert.SerializeObject(payload);
        CPH.WebsocketBroadcastJson(json);
        CPH.LogInfo($"[Breaking News Overlay] Broadcast: {json}");
    }

    private Dictionary<string, object> BuildOverridesFromArgs()
    {
        var overrides = new Dictionary<string, object>();

        AddStringOverride(overrides, "labelBg", "bnLabelBg", "labelBg");
        AddStringOverride(overrides, "labelText", "bnLabelText", "labelText");
        AddStringOverride(overrides, "subtitleBg", "bnSubtitleBg", "subtitleBg");
        AddStringOverride(overrides, "subtitleText", "bnSubtitleText", "subtitleText");
        AddStringOverride(overrides, "tickerBg", "bnTickerBg", "tickerBg");
        AddStringOverride(overrides, "tickerText", "bnTickerText", "tickerText");
        AddStringOverride(overrides, "fontFamily", "bnFontFamily", "fontFamily");

        AddIntOverride(overrides, "barHeight", "bnBarHeight", "barHeight");
        AddIntOverride(overrides, "barBottom", "bnBarBottom", "barBottom");
        AddIntOverride(overrides, "barSideMargin", "bnBarSideMargin", "barSideMargin");
        AddIntOverride(overrides, "labelWidth", "bnLabelWidth", "labelWidth");
        AddIntOverride(overrides, "barRadius", "bnBarRadius", "barRadius");
        AddIntOverride(overrides, "labelSize", "bnLabelSize", "labelSize");
        AddIntOverride(overrides, "subtitleSize", "bnSubtitleSize", "subtitleSize");
        AddIntOverride(overrides, "headlineSize", "bnHeadlineSize", "headlineSize");
        AddIntOverride(overrides, "scrollSpeed", "bnScrollSpeed", "scrollSpeed");
        AddIntOverride(overrides, "defaultDurationSeconds", "bnDefaultDuration", "defaultDurationSeconds");

        return overrides;
    }

    private void AddStringOverride(Dictionary<string, object> overrides, string outputKey, params string[] possibleArgNames)
    {
        foreach (string argName in possibleArgNames)
        {
            string value = GetStringArg(argName, "");
            if (!string.IsNullOrWhiteSpace(value))
            {
                overrides[outputKey] = value;
                return;
            }
        }
    }

    private void AddIntOverride(Dictionary<string, object> overrides, string outputKey, params string[] possibleArgNames)
    {
        foreach (string argName in possibleArgNames)
        {
            if (TryGetIntArg(argName, out int value))
            {
                overrides[outputKey] = value;
                return;
            }
        }
    }

    private string GetStringArg(string name, string fallback = "")
    {
        if (args != null && args.ContainsKey(name) && args[name] != null)
        {
            return args[name].ToString();
        }

        return fallback;
    }

    private int GetIntArg(string name, int fallback = 0)
    {
        return TryGetIntArg(name, out int value) ? value : fallback;
    }

    private bool TryGetIntArg(string name, out int value)
    {
        value = 0;
        if (args == null || !args.ContainsKey(name) || args[name] == null) return false;

        object raw = args[name];
        if (raw is int intValue)
        {
            value = intValue;
            return true;
        }

        return int.TryParse(raw.ToString(), out value);
    }
}
