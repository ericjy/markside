# Vega-Lite charts

A line chart with two series:

```vega-lite
{
  "title": "Requests",
  "data": {
    "values": [
      { "day": "Mon", "count": 30, "service": "api" },
      { "day": "Tue", "count": 55, "service": "api" },
      { "day": "Wed", "count": 80, "service": "api" },
      { "day": "Mon", "count": 20, "service": "web" },
      { "day": "Tue", "count": 35, "service": "web" },
      { "day": "Wed", "count": 40, "service": "web" }
    ]
  },
  "mark": { "type": "line", "point": true },
  "encoding": {
    "x": { "field": "day", "type": "nominal" },
    "y": { "field": "count", "type": "quantitative" },
    "color": { "field": "service" }
  }
}
```

A bar chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "team": "Search",
        "tickets": 28
      },
      {
        "team": "Billing",
        "tickets": 55
      },
      {
        "team": "Mobile",
        "tickets": 43
      },
      {
        "team": "Infra",
        "tickets": 91
      },
      {
        "team": "Docs",
        "tickets": 17
      }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "field": "team",
      "type": "nominal",
      "sort": "-y",
      "title": "Team"
    },
    "y": {
      "field": "tickets",
      "type": "quantitative",
      "title": "Open tickets"
    }
  }
}
```

A horizontal bar chart with value labels, layered from two marks:

```vega-lite
{
  "data": {
    "values": [
      {
        "browser": "Chrome",
        "share": 64
      },
      {
        "browser": "Safari",
        "share": 19
      },
      {
        "browser": "Edge",
        "share": 5
      },
      {
        "browser": "Firefox",
        "share": 3
      }
    ]
  },
  "encoding": {
    "y": {
      "field": "browser",
      "type": "nominal",
      "sort": "-x",
      "title": null
    },
    "x": {
      "field": "share",
      "type": "quantitative",
      "title": "Share (%)"
    }
  },
  "layer": [
    {
      "mark": "bar"
    },
    {
      "mark": {
        "type": "text",
        "align": "left",
        "dx": 4
      },
      "encoding": {
        "text": {
          "field": "share"
        }
      }
    }
  ]
}
```

A stacked bar chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "month": "Jan",
        "plan": "Free",
        "users": 120
      },
      {
        "month": "Jan",
        "plan": "Pro",
        "users": 80
      },
      {
        "month": "Jan",
        "plan": "Team",
        "users": 30
      },
      {
        "month": "Feb",
        "plan": "Free",
        "users": 135
      },
      {
        "month": "Feb",
        "plan": "Pro",
        "users": 90
      },
      {
        "month": "Feb",
        "plan": "Team",
        "users": 42
      },
      {
        "month": "Mar",
        "plan": "Free",
        "users": 150
      },
      {
        "month": "Mar",
        "plan": "Pro",
        "users": 85
      },
      {
        "month": "Mar",
        "plan": "Team",
        "users": 55
      },
      {
        "month": "Apr",
        "plan": "Free",
        "users": 170
      },
      {
        "month": "Apr",
        "plan": "Pro",
        "users": 110
      },
      {
        "month": "Apr",
        "plan": "Team",
        "users": 61
      },
      {
        "month": "May",
        "plan": "Free",
        "users": 160
      },
      {
        "month": "May",
        "plan": "Pro",
        "users": 125
      },
      {
        "month": "May",
        "plan": "Team",
        "users": 78
      },
      {
        "month": "Jun",
        "plan": "Free",
        "users": 190
      },
      {
        "month": "Jun",
        "plan": "Pro",
        "users": 140
      },
      {
        "month": "Jun",
        "plan": "Team",
        "users": 92
      }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "field": "month",
      "type": "ordinal",
      "sort": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun"
      ],
      "title": null
    },
    "y": {
      "field": "users",
      "type": "quantitative",
      "title": "Users"
    },
    "color": {
      "field": "plan",
      "title": "Plan"
    }
  }
}
```

A stacked area chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "month": "Jan",
        "plan": "Free",
        "users": 120
      },
      {
        "month": "Jan",
        "plan": "Pro",
        "users": 80
      },
      {
        "month": "Jan",
        "plan": "Team",
        "users": 30
      },
      {
        "month": "Feb",
        "plan": "Free",
        "users": 135
      },
      {
        "month": "Feb",
        "plan": "Pro",
        "users": 90
      },
      {
        "month": "Feb",
        "plan": "Team",
        "users": 42
      },
      {
        "month": "Mar",
        "plan": "Free",
        "users": 150
      },
      {
        "month": "Mar",
        "plan": "Pro",
        "users": 85
      },
      {
        "month": "Mar",
        "plan": "Team",
        "users": 55
      },
      {
        "month": "Apr",
        "plan": "Free",
        "users": 170
      },
      {
        "month": "Apr",
        "plan": "Pro",
        "users": 110
      },
      {
        "month": "Apr",
        "plan": "Team",
        "users": 61
      },
      {
        "month": "May",
        "plan": "Free",
        "users": 160
      },
      {
        "month": "May",
        "plan": "Pro",
        "users": 125
      },
      {
        "month": "May",
        "plan": "Team",
        "users": 78
      },
      {
        "month": "Jun",
        "plan": "Free",
        "users": 190
      },
      {
        "month": "Jun",
        "plan": "Pro",
        "users": 140
      },
      {
        "month": "Jun",
        "plan": "Team",
        "users": 92
      }
    ]
  },
  "mark": {
    "type": "area",
    "opacity": 0.8
  },
  "encoding": {
    "x": {
      "field": "month",
      "type": "ordinal",
      "sort": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun"
      ],
      "title": null
    },
    "y": {
      "field": "users",
      "type": "quantitative",
      "stack": "zero",
      "title": "Users"
    },
    "color": {
      "field": "plan",
      "title": "Plan"
    }
  }
}
```

A scatter plot with point size and color:

```vega-lite
{
  "data": {
    "values": [
      {
        "latency": 120,
        "errors": 0.4,
        "traffic": 900,
        "region": "us"
      },
      {
        "latency": 180,
        "errors": 0.9,
        "traffic": 650,
        "region": "us"
      },
      {
        "latency": 95,
        "errors": 0.2,
        "traffic": 1200,
        "region": "us"
      },
      {
        "latency": 240,
        "errors": 1.6,
        "traffic": 300,
        "region": "eu"
      },
      {
        "latency": 210,
        "errors": 1.1,
        "traffic": 520,
        "region": "eu"
      },
      {
        "latency": 150,
        "errors": 0.7,
        "traffic": 760,
        "region": "eu"
      },
      {
        "latency": 320,
        "errors": 2.4,
        "traffic": 210,
        "region": "ap"
      },
      {
        "latency": 280,
        "errors": 1.9,
        "traffic": 340,
        "region": "ap"
      }
    ]
  },
  "mark": {
    "type": "point",
    "filled": true
  },
  "encoding": {
    "x": {
      "field": "latency",
      "type": "quantitative",
      "title": "Latency (ms)"
    },
    "y": {
      "field": "errors",
      "type": "quantitative",
      "title": "Error rate (%)"
    },
    "size": {
      "field": "traffic",
      "type": "quantitative",
      "title": "Requests"
    },
    "color": {
      "field": "region",
      "title": "Region"
    }
  }
}
```

A histogram, binned from raw values:

```vega-lite
{
  "data": {
    "values": [
      {
        "ms": 42
      },
      {
        "ms": 55
      },
      {
        "ms": 61
      },
      {
        "ms": 63
      },
      {
        "ms": 70
      },
      {
        "ms": 72
      },
      {
        "ms": 75
      },
      {
        "ms": 78
      },
      {
        "ms": 81
      },
      {
        "ms": 84
      },
      {
        "ms": 88
      },
      {
        "ms": 90
      },
      {
        "ms": 93
      },
      {
        "ms": 95
      },
      {
        "ms": 99
      },
      {
        "ms": 104
      },
      {
        "ms": 108
      },
      {
        "ms": 112
      },
      {
        "ms": 119
      },
      {
        "ms": 125
      },
      {
        "ms": 131
      },
      {
        "ms": 148
      },
      {
        "ms": 160
      },
      {
        "ms": 185
      },
      {
        "ms": 240
      }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "bin": {
        "maxbins": 10
      },
      "field": "ms",
      "type": "quantitative",
      "title": "Response time (ms)"
    },
    "y": {
      "aggregate": "count",
      "title": "Requests"
    }
  }
}
```

A donut chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "category": "Reading",
        "minutes": 45
      },
      {
        "category": "Editing",
        "minutes": 30
      },
      {
        "category": "Reviewing",
        "minutes": 20
      },
      {
        "category": "Sharing",
        "minutes": 5
      }
    ]
  },
  "width": 300,
  "height": 300,
  "mark": {
    "type": "arc",
    "innerRadius": 70
  },
  "encoding": {
    "theta": {
      "field": "minutes",
      "type": "quantitative"
    },
    "color": {
      "field": "category",
      "title": "Activity"
    }
  }
}
```

A heatmap:

```vega-lite
{
  "data": {
    "values": [
      {
        "day": "Mon",
        "time": "Morning",
        "commits": 3
      },
      {
        "day": "Mon",
        "time": "Noon",
        "commits": 8
      },
      {
        "day": "Mon",
        "time": "Afternoon",
        "commits": 12
      },
      {
        "day": "Mon",
        "time": "Evening",
        "commits": 6
      },
      {
        "day": "Tue",
        "time": "Morning",
        "commits": 5
      },
      {
        "day": "Tue",
        "time": "Noon",
        "commits": 14
      },
      {
        "day": "Tue",
        "time": "Afternoon",
        "commits": 18
      },
      {
        "day": "Tue",
        "time": "Evening",
        "commits": 9
      },
      {
        "day": "Wed",
        "time": "Morning",
        "commits": 4
      },
      {
        "day": "Wed",
        "time": "Noon",
        "commits": 11
      },
      {
        "day": "Wed",
        "time": "Afternoon",
        "commits": 20
      },
      {
        "day": "Wed",
        "time": "Evening",
        "commits": 7
      },
      {
        "day": "Thu",
        "time": "Morning",
        "commits": 6
      },
      {
        "day": "Thu",
        "time": "Noon",
        "commits": 16
      },
      {
        "day": "Thu",
        "time": "Afternoon",
        "commits": 15
      },
      {
        "day": "Thu",
        "time": "Evening",
        "commits": 10
      },
      {
        "day": "Fri",
        "time": "Morning",
        "commits": 2
      },
      {
        "day": "Fri",
        "time": "Noon",
        "commits": 7
      },
      {
        "day": "Fri",
        "time": "Afternoon",
        "commits": 9
      },
      {
        "day": "Fri",
        "time": "Evening",
        "commits": 4
      }
    ]
  },
  "mark": "rect",
  "encoding": {
    "x": {
      "field": "time",
      "type": "ordinal",
      "sort": [
        "Morning",
        "Noon",
        "Afternoon",
        "Evening"
      ],
      "title": null
    },
    "y": {
      "field": "day",
      "type": "ordinal",
      "sort": [
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri"
      ],
      "title": null
    },
    "color": {
      "field": "commits",
      "type": "quantitative",
      "title": "Commits"
    }
  }
}
```

A line with a calculated field and a target rule, layered:

```vega-lite
{
  "data": {
    "values": [
      {
        "week": 1,
        "done": 12,
        "total": 60
      },
      {
        "week": 2,
        "done": 21,
        "total": 60
      },
      {
        "week": 3,
        "done": 33,
        "total": 60
      },
      {
        "week": 4,
        "done": 38,
        "total": 60
      },
      {
        "week": 5,
        "done": 49,
        "total": 60
      },
      {
        "week": 6,
        "done": 57,
        "total": 60
      }
    ]
  },
  "transform": [
    {
      "calculate": "datum.done / datum.total * 100",
      "as": "percent"
    }
  ],
  "layer": [
    {
      "mark": {
        "type": "line",
        "point": true
      },
      "encoding": {
        "x": {
          "field": "week",
          "type": "quantitative",
          "title": "Week",
          "axis": {
            "tickMinStep": 1
          }
        },
        "y": {
          "field": "percent",
          "type": "quantitative",
          "title": "Complete (%)",
          "scale": {
            "domain": [
              0,
              100
            ]
          }
        }
      }
    },
    {
      "mark": {
        "type": "rule",
        "strokeDash": [
          4,
          4
        ]
      },
      "encoding": {
        "y": {
          "datum": 80
        }
      }
    }
  ]
}
```

Small multiples, one chart per plan:

```vega-lite
{
  "data": {
    "values": [
      {
        "month": "Jan",
        "plan": "Free",
        "users": 120
      },
      {
        "month": "Jan",
        "plan": "Pro",
        "users": 80
      },
      {
        "month": "Jan",
        "plan": "Team",
        "users": 30
      },
      {
        "month": "Feb",
        "plan": "Free",
        "users": 135
      },
      {
        "month": "Feb",
        "plan": "Pro",
        "users": 90
      },
      {
        "month": "Feb",
        "plan": "Team",
        "users": 42
      },
      {
        "month": "Mar",
        "plan": "Free",
        "users": 150
      },
      {
        "month": "Mar",
        "plan": "Pro",
        "users": 85
      },
      {
        "month": "Mar",
        "plan": "Team",
        "users": 55
      },
      {
        "month": "Apr",
        "plan": "Free",
        "users": 170
      },
      {
        "month": "Apr",
        "plan": "Pro",
        "users": 110
      },
      {
        "month": "Apr",
        "plan": "Team",
        "users": 61
      },
      {
        "month": "May",
        "plan": "Free",
        "users": 160
      },
      {
        "month": "May",
        "plan": "Pro",
        "users": 125
      },
      {
        "month": "May",
        "plan": "Team",
        "users": 78
      },
      {
        "month": "Jun",
        "plan": "Free",
        "users": 190
      },
      {
        "month": "Jun",
        "plan": "Pro",
        "users": 140
      },
      {
        "month": "Jun",
        "plan": "Team",
        "users": 92
      }
    ]
  },
  "width": 160,
  "height": 140,
  "mark": "line",
  "encoding": {
    "facet": {
      "field": "plan",
      "title": null,
      "columns": 3
    },
    "x": {
      "field": "month",
      "type": "ordinal",
      "sort": [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun"
      ],
      "title": null
    },
    "y": {
      "field": "users",
      "type": "quantitative",
      "title": "Users"
    }
  }
}
```

A grouped bar chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "quarter": "Q1",
        "year": "2025",
        "revenue": 42
      },
      {
        "quarter": "Q2",
        "year": "2025",
        "revenue": 48
      },
      {
        "quarter": "Q3",
        "year": "2025",
        "revenue": 51
      },
      {
        "quarter": "Q4",
        "year": "2025",
        "revenue": 60
      },
      {
        "quarter": "Q1",
        "year": "2026",
        "revenue": 55
      },
      {
        "quarter": "Q2",
        "year": "2026",
        "revenue": 63
      },
      {
        "quarter": "Q3",
        "year": "2026",
        "revenue": 70
      },
      {
        "quarter": "Q4",
        "year": "2026",
        "revenue": 82
      }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "field": "quarter",
      "type": "nominal",
      "title": null
    },
    "xOffset": {
      "field": "year"
    },
    "y": {
      "field": "revenue",
      "type": "quantitative",
      "title": "Revenue ($M)"
    },
    "color": {
      "field": "year",
      "title": "Year"
    }
  }
}
```

A single-series area chart over dates:

```vega-lite
{
  "title": {
    "text": "Weekly active readers",
    "subtitle": "First week of each month, 2026"
  },
  "data": {
    "values": [
      {
        "date": "2026-01-05",
        "readers": 120
      },
      {
        "date": "2026-02-02",
        "readers": 135
      },
      {
        "date": "2026-03-02",
        "readers": 128
      },
      {
        "date": "2026-04-06",
        "readers": 160
      },
      {
        "date": "2026-05-04",
        "readers": 185
      },
      {
        "date": "2026-06-01",
        "readers": 178
      },
      {
        "date": "2026-07-06",
        "readers": 210
      },
      {
        "date": "2026-08-03",
        "readers": 240
      },
      {
        "date": "2026-09-07",
        "readers": 232
      },
      {
        "date": "2026-10-05",
        "readers": 275
      }
    ]
  },
  "mark": "area",
  "encoding": {
    "x": {
      "field": "date",
      "type": "temporal",
      "title": null,
      "axis": {
        "format": "%b"
      }
    },
    "y": {
      "field": "readers",
      "type": "quantitative",
      "title": null
    }
  }
}
```

Lines labeled directly, with no legend:

```vega-lite
{
  "data": {
    "values": [
      {
        "month": "Jun",
        "mode": "Preview",
        "share": 60
      },
      {
        "month": "Jul",
        "mode": "Preview",
        "share": 62
      },
      {
        "month": "Aug",
        "mode": "Preview",
        "share": 65
      },
      {
        "month": "Sep",
        "mode": "Preview",
        "share": 70
      },
      {
        "month": "Oct",
        "mode": "Preview",
        "share": 74
      },
      {
        "month": "Jun",
        "mode": "Source",
        "share": 30
      },
      {
        "month": "Jul",
        "mode": "Source",
        "share": 28
      },
      {
        "month": "Aug",
        "mode": "Source",
        "share": 25
      },
      {
        "month": "Sep",
        "mode": "Source",
        "share": 20
      },
      {
        "month": "Oct",
        "mode": "Source",
        "share": 16
      },
      {
        "month": "Jun",
        "mode": "Split",
        "share": 10
      },
      {
        "month": "Jul",
        "mode": "Split",
        "share": 10
      },
      {
        "month": "Aug",
        "mode": "Split",
        "share": 10
      },
      {
        "month": "Sep",
        "mode": "Split",
        "share": 10
      },
      {
        "month": "Oct",
        "mode": "Split",
        "share": 10
      }
    ]
  },
  "encoding": {
    "x": {
      "field": "month",
      "type": "ordinal",
      "sort": [
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct"
      ],
      "title": null
    },
    "y": {
      "field": "share",
      "type": "quantitative",
      "title": "Share of sessions (%)"
    },
    "color": {
      "field": "mode",
      "legend": null
    }
  },
  "layer": [
    {
      "mark": "line"
    },
    {
      "transform": [
        {
          "filter": "datum.month === 'Oct'"
        }
      ],
      "mark": {
        "type": "text",
        "align": "left",
        "dx": 8
      },
      "encoding": {
        "text": {
          "field": "mode"
        },
        "color": {
          "value": "var(--pele-muted)"
        }
      }
    }
  ]
}
```

A slope chart comparing two points in time:

```vega-lite
{
  "data": {
    "values": [
      {
        "t": "Before",
        "team": "Search",
        "ms": 420
      },
      {
        "t": "After",
        "team": "Search",
        "ms": 180
      },
      {
        "t": "Before",
        "team": "Billing",
        "ms": 300
      },
      {
        "t": "After",
        "team": "Billing",
        "ms": 290
      },
      {
        "t": "Before",
        "team": "Mobile",
        "ms": 240
      },
      {
        "t": "After",
        "team": "Mobile",
        "ms": 310
      }
    ]
  },
  "width": 320,
  "height": 280,
  "mark": {
    "type": "line",
    "point": true
  },
  "encoding": {
    "x": {
      "field": "t",
      "type": "ordinal",
      "sort": [
        "Before",
        "After"
      ],
      "title": null
    },
    "y": {
      "field": "ms",
      "type": "quantitative",
      "title": "Latency (ms)"
    },
    "color": {
      "field": "team",
      "title": "Team"
    }
  }
}
```

A lollipop chart:

```vega-lite
{
  "data": {
    "values": [
      {
        "task": "Parse",
        "ms": 12
      },
      {
        "task": "Render",
        "ms": 48
      },
      {
        "task": "Highlight",
        "ms": 86
      },
      {
        "task": "Layout",
        "ms": 33
      },
      {
        "task": "Paint",
        "ms": 21
      }
    ]
  },
  "encoding": {
    "y": {
      "field": "task",
      "type": "nominal",
      "sort": "-x",
      "title": null
    },
    "x": {
      "field": "ms",
      "type": "quantitative",
      "title": "Time (ms)"
    }
  },
  "layer": [
    {
      "mark": {
        "type": "rule",
        "strokeWidth": 2,
        "color": "var(--chart-1)"
      }
    },
    {
      "mark": {
        "type": "point",
        "size": 120
      }
    }
  ]
}
```

A diverging bar chart with positive and negative values:

```vega-lite
{
  "data": {
    "values": [
      {
        "m": "Jun",
        "net": 12
      },
      {
        "m": "Jul",
        "net": -8
      },
      {
        "m": "Aug",
        "net": 21
      },
      {
        "m": "Sep",
        "net": -3
      },
      {
        "m": "Oct",
        "net": 16
      }
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {
      "field": "m",
      "type": "ordinal",
      "sort": [
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct"
      ],
      "title": null,
      "axis": {
        "labelPadding": 8
      }
    },
    "y": {
      "field": "net",
      "type": "quantitative",
      "title": "Net change"
    },
    "color": {
      "condition": {
        "test": "datum.net < 0",
        "value": "var(--chart-2)"
      },
      "value": "var(--chart-1)"
    }
  }
}
```

A project timeline, with bars from start to end dates:

```vega-lite
{
  "data": {
    "values": [
      {
        "task": "Interview",
        "start": "2026-10-01",
        "end": "2026-10-05",
        "stream": "Design"
      },
      {
        "task": "Spec",
        "start": "2026-10-05",
        "end": "2026-10-12",
        "stream": "Design"
      },
      {
        "task": "Engine",
        "start": "2026-10-10",
        "end": "2026-10-20",
        "stream": "Build"
      },
      {
        "task": "Viewer",
        "start": "2026-10-18",
        "end": "2026-10-26",
        "stream": "Build"
      },
      {
        "task": "Release",
        "start": "2026-10-26",
        "end": "2026-10-31",
        "stream": "Ship"
      }
    ]
  },
  "mark": "bar",
  "encoding": {
    "y": {
      "field": "task",
      "type": "ordinal",
      "sort": null,
      "title": null
    },
    "x": {
      "field": "start",
      "type": "temporal",
      "title": null,
      "axis": {
        "format": "%b %d"
      }
    },
    "x2": {
      "field": "end"
    },
    "color": {
      "field": "stream",
      "title": "Stream"
    }
  }
}
```

A box plot showing spread:

```vega-lite
{
  "data": {
    "values": [
      {
        "service": "api",
        "ms": 80
      },
      {
        "service": "api",
        "ms": 92
      },
      {
        "service": "api",
        "ms": 95
      },
      {
        "service": "api",
        "ms": 101
      },
      {
        "service": "api",
        "ms": 108
      },
      {
        "service": "api",
        "ms": 112
      },
      {
        "service": "api",
        "ms": 118
      },
      {
        "service": "api",
        "ms": 125
      },
      {
        "service": "api",
        "ms": 132
      },
      {
        "service": "api",
        "ms": 160
      },
      {
        "service": "web",
        "ms": 120
      },
      {
        "service": "web",
        "ms": 135
      },
      {
        "service": "web",
        "ms": 140
      },
      {
        "service": "web",
        "ms": 150
      },
      {
        "service": "web",
        "ms": 155
      },
      {
        "service": "web",
        "ms": 160
      },
      {
        "service": "web",
        "ms": 171
      },
      {
        "service": "web",
        "ms": 180
      },
      {
        "service": "web",
        "ms": 195
      },
      {
        "service": "web",
        "ms": 240
      },
      {
        "service": "worker",
        "ms": 40
      },
      {
        "service": "worker",
        "ms": 48
      },
      {
        "service": "worker",
        "ms": 52
      },
      {
        "service": "worker",
        "ms": 55
      },
      {
        "service": "worker",
        "ms": 58
      },
      {
        "service": "worker",
        "ms": 60
      },
      {
        "service": "worker",
        "ms": 66
      },
      {
        "service": "worker",
        "ms": 72
      },
      {
        "service": "worker",
        "ms": 80
      },
      {
        "service": "worker",
        "ms": 110
      }
    ]
  },
  "mark": {
    "type": "boxplot",
    "extent": 1.5,
    "size": 28
  },
  "encoding": {
    "x": {
      "field": "service",
      "type": "nominal",
      "title": null
    },
    "y": {
      "field": "ms",
      "type": "quantitative",
      "title": "Response time (ms)"
    }
  }
}
```

A line with an uncertainty band:

```vega-lite
{
  "data": {
    "values": [
      {
        "week": 1,
        "mean": 20,
        "lo": 14,
        "hi": 27
      },
      {
        "week": 2,
        "mean": 26,
        "lo": 20,
        "hi": 33
      },
      {
        "week": 3,
        "mean": 31,
        "lo": 24,
        "hi": 38
      },
      {
        "week": 4,
        "mean": 29,
        "lo": 21,
        "hi": 37
      },
      {
        "week": 5,
        "mean": 36,
        "lo": 29,
        "hi": 44
      },
      {
        "week": 6,
        "mean": 42,
        "lo": 34,
        "hi": 51
      }
    ]
  },
  "encoding": {
    "x": {
      "field": "week",
      "type": "quantitative",
      "title": "Week",
      "axis": {
        "tickMinStep": 1
      }
    }
  },
  "layer": [
    {
      "mark": {
        "type": "area",
        "line": false,
        "fillOpacity": 0.2
      },
      "encoding": {
        "y": {
          "field": "lo",
          "type": "quantitative",
          "title": "Conversions"
        },
        "y2": {
          "field": "hi"
        }
      }
    },
    {
      "mark": "line",
      "encoding": {
        "y": {
          "field": "mean",
          "type": "quantitative"
        }
      }
    }
  ]
}
```

A strip plot of individual values:

```vega-lite
{
  "data": {
    "values": [
      {
        "service": "api",
        "ms": 80
      },
      {
        "service": "api",
        "ms": 92
      },
      {
        "service": "api",
        "ms": 95
      },
      {
        "service": "api",
        "ms": 101
      },
      {
        "service": "api",
        "ms": 108
      },
      {
        "service": "api",
        "ms": 112
      },
      {
        "service": "api",
        "ms": 118
      },
      {
        "service": "api",
        "ms": 125
      },
      {
        "service": "api",
        "ms": 132
      },
      {
        "service": "api",
        "ms": 160
      },
      {
        "service": "web",
        "ms": 120
      },
      {
        "service": "web",
        "ms": 135
      },
      {
        "service": "web",
        "ms": 140
      },
      {
        "service": "web",
        "ms": 150
      },
      {
        "service": "web",
        "ms": 155
      },
      {
        "service": "web",
        "ms": 160
      },
      {
        "service": "web",
        "ms": 171
      },
      {
        "service": "web",
        "ms": 180
      },
      {
        "service": "web",
        "ms": 195
      },
      {
        "service": "web",
        "ms": 240
      },
      {
        "service": "worker",
        "ms": 40
      },
      {
        "service": "worker",
        "ms": 48
      },
      {
        "service": "worker",
        "ms": 52
      },
      {
        "service": "worker",
        "ms": 55
      },
      {
        "service": "worker",
        "ms": 58
      },
      {
        "service": "worker",
        "ms": 60
      },
      {
        "service": "worker",
        "ms": 66
      },
      {
        "service": "worker",
        "ms": 72
      },
      {
        "service": "worker",
        "ms": 80
      },
      {
        "service": "worker",
        "ms": 110
      }
    ]
  },
  "mark": {
    "type": "tick",
    "thickness": 2
  },
  "encoding": {
    "x": {
      "field": "ms",
      "type": "quantitative",
      "title": "Response time (ms)"
    },
    "y": {
      "field": "service",
      "type": "nominal",
      "title": null
    },
    "color": {
      "field": "service",
      "legend": null
    }
  }
}
```

Two charts side by side:

```vega-lite
{
  "data": {
    "values": [
      {
        "task": "Parse",
        "ms": 12
      },
      {
        "task": "Render",
        "ms": 48
      },
      {
        "task": "Highlight",
        "ms": 86
      },
      {
        "task": "Layout",
        "ms": 33
      },
      {
        "task": "Paint",
        "ms": 21
      }
    ]
  },
  "hconcat": [
    {
      "width": 240,
      "height": 200,
      "title": "Time per task",
      "mark": "bar",
      "encoding": {
        "x": {
          "field": "task",
          "type": "nominal",
            "sort": null,
          "title": null
        },
        "y": {
          "field": "ms",
          "type": "quantitative",
          "title": "ms"
        }
      }
    },
    {
      "width": 240,
      "height": 200,
      "title": "Cumulative",
      "transform": [
        {
          "window": [
            {
              "op": "sum",
              "field": "ms",
              "as": "total"
            }
          ]
        }
      ],
      "mark": {
        "type": "line",
        "point": true
      },
      "encoding": {
        "x": {
          "field": "task",
          "type": "nominal",
          "title": null,
          "sort": null
        },
        "y": {
          "field": "total",
          "type": "quantitative",
          "title": "ms"
        }
      }
    }
  ]
}
```

A multi-series line chart with a halo around each line, using generated prices:

```vega-lite
{"data": {"values": [
    {"date":"2004-01-01","symbol":"GOOG","price":100.7},
    {"date":"2004-02-01","symbol":"GOOG","price":108.4},
    {"date":"2004-03-01","symbol":"GOOG","price":109.4},
    {"date":"2004-04-01","symbol":"GOOG","price":109.6},
    {"date":"2004-05-01","symbol":"GOOG","price":103.7},
    {"date":"2004-06-01","symbol":"GOOG","price":104.8},
    {"date":"2004-07-01","symbol":"GOOG","price":118.4},
    {"date":"2004-08-01","symbol":"GOOG","price":126.5},
    {"date":"2004-09-01","symbol":"GOOG","price":142.1},
    {"date":"2004-10-01","symbol":"GOOG","price":149.6},
    {"date":"2004-11-01","symbol":"GOOG","price":159.4},
    {"date":"2004-12-01","symbol":"GOOG","price":166.8},
    {"date":"2005-01-01","symbol":"GOOG","price":146.8},
    {"date":"2005-02-01","symbol":"GOOG","price":162.5},
    {"date":"2005-03-01","symbol":"GOOG","price":174.8},
    {"date":"2005-04-01","symbol":"GOOG","price":187.9},
    {"date":"2005-05-01","symbol":"GOOG","price":164.9},
    {"date":"2005-06-01","symbol":"GOOG","price":144.0},
    {"date":"2005-07-01","symbol":"GOOG","price":136.8},
    {"date":"2005-08-01","symbol":"GOOG","price":135.1},
    {"date":"2005-09-01","symbol":"GOOG","price":142.9},
    {"date":"2005-10-01","symbol":"GOOG","price":146.6},
    {"date":"2005-11-01","symbol":"GOOG","price":157.8},
    {"date":"2005-12-01","symbol":"GOOG","price":153.5},
    {"date":"2006-01-01","symbol":"GOOG","price":162.3},
    {"date":"2006-02-01","symbol":"GOOG","price":173.0},
    {"date":"2006-03-01","symbol":"GOOG","price":167.9},
    {"date":"2006-04-01","symbol":"GOOG","price":198.8},
    {"date":"2006-05-01","symbol":"GOOG","price":214.8},
    {"date":"2006-06-01","symbol":"GOOG","price":244.3},
    {"date":"2006-07-01","symbol":"GOOG","price":238.0},
    {"date":"2006-08-01","symbol":"GOOG","price":229.3},
    {"date":"2006-09-01","symbol":"GOOG","price":229.1},
    {"date":"2006-10-01","symbol":"GOOG","price":233.8},
    {"date":"2006-11-01","symbol":"GOOG","price":254.1},
    {"date":"2006-12-01","symbol":"GOOG","price":267.4},
    {"date":"2007-01-01","symbol":"GOOG","price":264.7},
    {"date":"2007-02-01","symbol":"GOOG","price":249.8},
    {"date":"2007-03-01","symbol":"GOOG","price":245.6},
    {"date":"2007-04-01","symbol":"GOOG","price":279.9},
    {"date":"2007-05-01","symbol":"GOOG","price":268.0},
    {"date":"2007-06-01","symbol":"GOOG","price":281.9},
    {"date":"2007-07-01","symbol":"GOOG","price":301.2},
    {"date":"2007-08-01","symbol":"GOOG","price":269.9},
    {"date":"2007-09-01","symbol":"GOOG","price":279.1},
    {"date":"2007-10-01","symbol":"GOOG","price":320.3},
    {"date":"2007-11-01","symbol":"GOOG","price":271.9},
    {"date":"2007-12-01","symbol":"GOOG","price":272.1},
    {"date":"2008-01-01","symbol":"GOOG","price":277.7},
    {"date":"2008-02-01","symbol":"GOOG","price":265.6},
    {"date":"2008-03-01","symbol":"GOOG","price":285.5},
    {"date":"2008-04-01","symbol":"GOOG","price":292.4},
    {"date":"2008-05-01","symbol":"GOOG","price":221.7},
    {"date":"2008-06-01","symbol":"GOOG","price":213.9},
    {"date":"2008-07-01","symbol":"GOOG","price":203.2},
    {"date":"2008-08-01","symbol":"GOOG","price":198.2},
    {"date":"2008-09-01","symbol":"GOOG","price":202.1},
    {"date":"2008-10-01","symbol":"GOOG","price":186.4},
    {"date":"2008-11-01","symbol":"GOOG","price":167.9},
    {"date":"2008-12-01","symbol":"GOOG","price":129.8},
    {"date":"2009-01-01","symbol":"GOOG","price":122.7},
    {"date":"2009-02-01","symbol":"GOOG","price":119.6},
    {"date":"2009-03-01","symbol":"GOOG","price":118.4},
    {"date":"2009-04-01","symbol":"GOOG","price":108.4},
    {"date":"2009-05-01","symbol":"GOOG","price":102.2},
    {"date":"2009-06-01","symbol":"GOOG","price":100.4},
    {"date":"2009-07-01","symbol":"GOOG","price":115.1},
    {"date":"2009-08-01","symbol":"GOOG","price":97.5},
    {"date":"2009-09-01","symbol":"GOOG","price":87.6},
    {"date":"2009-10-01","symbol":"GOOG","price":92.1},
    {"date":"2009-11-01","symbol":"GOOG","price":106.9},
    {"date":"2009-12-01","symbol":"GOOG","price":115.7},
    {"date":"2004-01-01","symbol":"AAPL","price":10.4},
    {"date":"2004-02-01","symbol":"AAPL","price":8.4},
    {"date":"2004-03-01","symbol":"AAPL","price":8.9},
    {"date":"2004-04-01","symbol":"AAPL","price":8.7},
    {"date":"2004-05-01","symbol":"AAPL","price":8.1},
    {"date":"2004-06-01","symbol":"AAPL","price":9.1},
    {"date":"2004-07-01","symbol":"AAPL","price":10.3},
    {"date":"2004-08-01","symbol":"AAPL","price":10.8},
    {"date":"2004-09-01","symbol":"AAPL","price":11.4},
    {"date":"2004-10-01","symbol":"AAPL","price":12.3},
    {"date":"2004-11-01","symbol":"AAPL","price":14.5},
    {"date":"2004-12-01","symbol":"AAPL","price":15.8},
    {"date":"2005-01-01","symbol":"AAPL","price":17.1},
    {"date":"2005-02-01","symbol":"AAPL","price":18.5},
    {"date":"2005-03-01","symbol":"AAPL","price":16.5},
    {"date":"2005-04-01","symbol":"AAPL","price":19.0},
    {"date":"2005-05-01","symbol":"AAPL","price":21.3},
    {"date":"2005-06-01","symbol":"AAPL","price":23.1},
    {"date":"2005-07-01","symbol":"AAPL","price":19.8},
    {"date":"2005-08-01","symbol":"AAPL","price":19.4},
    {"date":"2005-09-01","symbol":"AAPL","price":21.5},
    {"date":"2005-10-01","symbol":"AAPL","price":18.8},
    {"date":"2005-11-01","symbol":"AAPL","price":19.1},
    {"date":"2005-12-01","symbol":"AAPL","price":21.5},
    {"date":"2006-01-01","symbol":"AAPL","price":19.7},
    {"date":"2006-02-01","symbol":"AAPL","price":23.3},
    {"date":"2006-03-01","symbol":"AAPL","price":25.3},
    {"date":"2006-04-01","symbol":"AAPL","price":25.8},
    {"date":"2006-05-01","symbol":"AAPL","price":27.5},
    {"date":"2006-06-01","symbol":"AAPL","price":30.0},
    {"date":"2006-07-01","symbol":"AAPL","price":31.4},
    {"date":"2006-08-01","symbol":"AAPL","price":35.8},
    {"date":"2006-09-01","symbol":"AAPL","price":34.9},
    {"date":"2006-10-01","symbol":"AAPL","price":34.8},
    {"date":"2006-11-01","symbol":"AAPL","price":39.3},
    {"date":"2006-12-01","symbol":"AAPL","price":40.7},
    {"date":"2007-01-01","symbol":"AAPL","price":38.9},
    {"date":"2007-02-01","symbol":"AAPL","price":43.6},
    {"date":"2007-03-01","symbol":"AAPL","price":50.9},
    {"date":"2007-04-01","symbol":"AAPL","price":50.6},
    {"date":"2007-05-01","symbol":"AAPL","price":46.1},
    {"date":"2007-06-01","symbol":"AAPL","price":47.2},
    {"date":"2007-07-01","symbol":"AAPL","price":48.2},
    {"date":"2007-08-01","symbol":"AAPL","price":48.6},
    {"date":"2007-09-01","symbol":"AAPL","price":56.4},
    {"date":"2007-10-01","symbol":"AAPL","price":53.2},
    {"date":"2007-11-01","symbol":"AAPL","price":61.1},
    {"date":"2007-12-01","symbol":"AAPL","price":56.3},
    {"date":"2008-01-01","symbol":"AAPL","price":54.2},
    {"date":"2008-02-01","symbol":"AAPL","price":59.2},
    {"date":"2008-03-01","symbol":"AAPL","price":67.3},
    {"date":"2008-04-01","symbol":"AAPL","price":74.9},
    {"date":"2008-05-01","symbol":"AAPL","price":69.3},
    {"date":"2008-06-01","symbol":"AAPL","price":63.0},
    {"date":"2008-07-01","symbol":"AAPL","price":57.2},
    {"date":"2008-08-01","symbol":"AAPL","price":54.2},
    {"date":"2008-09-01","symbol":"AAPL","price":47.6},
    {"date":"2008-10-01","symbol":"AAPL","price":43.8},
    {"date":"2008-11-01","symbol":"AAPL","price":41.5},
    {"date":"2008-12-01","symbol":"AAPL","price":37.1},
    {"date":"2009-01-01","symbol":"AAPL","price":35.8},
    {"date":"2009-02-01","symbol":"AAPL","price":38.8},
    {"date":"2009-03-01","symbol":"AAPL","price":47.2},
    {"date":"2009-04-01","symbol":"AAPL","price":50.3},
    {"date":"2009-05-01","symbol":"AAPL","price":50.1},
    {"date":"2009-06-01","symbol":"AAPL","price":50.2},
    {"date":"2009-07-01","symbol":"AAPL","price":51.9},
    {"date":"2009-08-01","symbol":"AAPL","price":58.0},
    {"date":"2009-09-01","symbol":"AAPL","price":58.3},
    {"date":"2009-10-01","symbol":"AAPL","price":62.3},
    {"date":"2009-11-01","symbol":"AAPL","price":74.8},
    {"date":"2009-12-01","symbol":"AAPL","price":60.2},
    {"date":"2004-01-01","symbol":"AMZN","price":28.0},
    {"date":"2004-02-01","symbol":"AMZN","price":29.1},
    {"date":"2004-03-01","symbol":"AMZN","price":30.7},
    {"date":"2004-04-01","symbol":"AMZN","price":32.0},
    {"date":"2004-05-01","symbol":"AMZN","price":31.6},
    {"date":"2004-06-01","symbol":"AMZN","price":33.9},
    {"date":"2004-07-01","symbol":"AMZN","price":35.4},
    {"date":"2004-08-01","symbol":"AMZN","price":34.7},
    {"date":"2004-09-01","symbol":"AMZN","price":42.2},
    {"date":"2004-10-01","symbol":"AMZN","price":44.4},
    {"date":"2004-11-01","symbol":"AMZN","price":43.4},
    {"date":"2004-12-01","symbol":"AMZN","price":44.0},
    {"date":"2005-01-01","symbol":"AMZN","price":44.1},
    {"date":"2005-02-01","symbol":"AMZN","price":44.9},
    {"date":"2005-03-01","symbol":"AMZN","price":36.1},
    {"date":"2005-04-01","symbol":"AMZN","price":35.5},
    {"date":"2005-05-01","symbol":"AMZN","price":39.1},
    {"date":"2005-06-01","symbol":"AMZN","price":36.3},
    {"date":"2005-07-01","symbol":"AMZN","price":36.9},
    {"date":"2005-08-01","symbol":"AMZN","price":40.6},
    {"date":"2005-09-01","symbol":"AMZN","price":44.2},
    {"date":"2005-10-01","symbol":"AMZN","price":50.5},
    {"date":"2005-11-01","symbol":"AMZN","price":44.7},
    {"date":"2005-12-01","symbol":"AMZN","price":44.4},
    {"date":"2006-01-01","symbol":"AMZN","price":44.2},
    {"date":"2006-02-01","symbol":"AMZN","price":47.4},
    {"date":"2006-03-01","symbol":"AMZN","price":52.6},
    {"date":"2006-04-01","symbol":"AMZN","price":42.4},
    {"date":"2006-05-01","symbol":"AMZN","price":47.1},
    {"date":"2006-06-01","symbol":"AMZN","price":42.6},
    {"date":"2006-07-01","symbol":"AMZN","price":45.9},
    {"date":"2006-08-01","symbol":"AMZN","price":41.4},
    {"date":"2006-09-01","symbol":"AMZN","price":42.9},
    {"date":"2006-10-01","symbol":"AMZN","price":48.0},
    {"date":"2006-11-01","symbol":"AMZN","price":48.5},
    {"date":"2006-12-01","symbol":"AMZN","price":50.3},
    {"date":"2007-01-01","symbol":"AMZN","price":54.6},
    {"date":"2007-02-01","symbol":"AMZN","price":56.4},
    {"date":"2007-03-01","symbol":"AMZN","price":57.2},
    {"date":"2007-04-01","symbol":"AMZN","price":65.5},
    {"date":"2007-05-01","symbol":"AMZN","price":72.5},
    {"date":"2007-06-01","symbol":"AMZN","price":72.4},
    {"date":"2007-07-01","symbol":"AMZN","price":89.8},
    {"date":"2007-08-01","symbol":"AMZN","price":83.6},
    {"date":"2007-09-01","symbol":"AMZN","price":91.5},
    {"date":"2007-10-01","symbol":"AMZN","price":91.6},
    {"date":"2007-11-01","symbol":"AMZN","price":94.6},
    {"date":"2007-12-01","symbol":"AMZN","price":102.0},
    {"date":"2008-01-01","symbol":"AMZN","price":106.1},
    {"date":"2008-02-01","symbol":"AMZN","price":113.8},
    {"date":"2008-03-01","symbol":"AMZN","price":102.4},
    {"date":"2008-04-01","symbol":"AMZN","price":92.3},
    {"date":"2008-05-01","symbol":"AMZN","price":85.9},
    {"date":"2008-06-01","symbol":"AMZN","price":69.2},
    {"date":"2008-07-01","symbol":"AMZN","price":55.3},
    {"date":"2008-08-01","symbol":"AMZN","price":42.3},
    {"date":"2008-09-01","symbol":"AMZN","price":41.6},
    {"date":"2008-10-01","symbol":"AMZN","price":39.2},
    {"date":"2008-11-01","symbol":"AMZN","price":39.2},
    {"date":"2008-12-01","symbol":"AMZN","price":31.6},
    {"date":"2009-01-01","symbol":"AMZN","price":27.9},
    {"date":"2009-02-01","symbol":"AMZN","price":25.9},
    {"date":"2009-03-01","symbol":"AMZN","price":28.1},
    {"date":"2009-04-01","symbol":"AMZN","price":32.3},
    {"date":"2009-05-01","symbol":"AMZN","price":30.7},
    {"date":"2009-06-01","symbol":"AMZN","price":35.2},
    {"date":"2009-07-01","symbol":"AMZN","price":38.8},
    {"date":"2009-08-01","symbol":"AMZN","price":39.1},
    {"date":"2009-09-01","symbol":"AMZN","price":33.8},
    {"date":"2009-10-01","symbol":"AMZN","price":38.3},
    {"date":"2009-11-01","symbol":"AMZN","price":38.9},
    {"date":"2009-12-01","symbol":"AMZN","price":37.8},
    {"date":"2004-01-01","symbol":"IBM","price":86.9},
    {"date":"2004-02-01","symbol":"IBM","price":88.8},
    {"date":"2004-03-01","symbol":"IBM","price":94.7},
    {"date":"2004-04-01","symbol":"IBM","price":91.4},
    {"date":"2004-05-01","symbol":"IBM","price":96.1},
    {"date":"2004-06-01","symbol":"IBM","price":102.4},
    {"date":"2004-07-01","symbol":"IBM","price":108.9},
    {"date":"2004-08-01","symbol":"IBM","price":108.8},
    {"date":"2004-09-01","symbol":"IBM","price":106.2},
    {"date":"2004-10-01","symbol":"IBM","price":111.2},
    {"date":"2004-11-01","symbol":"IBM","price":112.4},
    {"date":"2004-12-01","symbol":"IBM","price":113.6},
    {"date":"2005-01-01","symbol":"IBM","price":120.7},
    {"date":"2005-02-01","symbol":"IBM","price":120.2},
    {"date":"2005-03-01","symbol":"IBM","price":109.9},
    {"date":"2005-04-01","symbol":"IBM","price":108.8},
    {"date":"2005-05-01","symbol":"IBM","price":101.4},
    {"date":"2005-06-01","symbol":"IBM","price":105.3},
    {"date":"2005-07-01","symbol":"IBM","price":107.3},
    {"date":"2005-08-01","symbol":"IBM","price":105.3},
    {"date":"2005-09-01","symbol":"IBM","price":105.9},
    {"date":"2005-10-01","symbol":"IBM","price":110.1},
    {"date":"2005-11-01","symbol":"IBM","price":111.1},
    {"date":"2005-12-01","symbol":"IBM","price":117.7},
    {"date":"2006-01-01","symbol":"IBM","price":118.1},
    {"date":"2006-02-01","symbol":"IBM","price":123.7},
    {"date":"2006-03-01","symbol":"IBM","price":131.8},
    {"date":"2006-04-01","symbol":"IBM","price":141.1},
    {"date":"2006-05-01","symbol":"IBM","price":138.1},
    {"date":"2006-06-01","symbol":"IBM","price":143.8},
    {"date":"2006-07-01","symbol":"IBM","price":133.9},
    {"date":"2006-08-01","symbol":"IBM","price":128.9},
    {"date":"2006-09-01","symbol":"IBM","price":119.6},
    {"date":"2006-10-01","symbol":"IBM","price":125.4},
    {"date":"2006-11-01","symbol":"IBM","price":120.0},
    {"date":"2006-12-01","symbol":"IBM","price":120.6},
    {"date":"2007-01-01","symbol":"IBM","price":120.4},
    {"date":"2007-02-01","symbol":"IBM","price":121.0},
    {"date":"2007-03-01","symbol":"IBM","price":118.9},
    {"date":"2007-04-01","symbol":"IBM","price":120.7},
    {"date":"2007-05-01","symbol":"IBM","price":130.1},
    {"date":"2007-06-01","symbol":"IBM","price":131.1},
    {"date":"2007-07-01","symbol":"IBM","price":134.6},
    {"date":"2007-08-01","symbol":"IBM","price":140.8},
    {"date":"2007-09-01","symbol":"IBM","price":140.6},
    {"date":"2007-10-01","symbol":"IBM","price":134.3},
    {"date":"2007-11-01","symbol":"IBM","price":132.2},
    {"date":"2007-12-01","symbol":"IBM","price":138.6},
    {"date":"2008-01-01","symbol":"IBM","price":130.3},
    {"date":"2008-02-01","symbol":"IBM","price":128.0},
    {"date":"2008-03-01","symbol":"IBM","price":133.9},
    {"date":"2008-04-01","symbol":"IBM","price":139.0},
    {"date":"2008-05-01","symbol":"IBM","price":120.4},
    {"date":"2008-06-01","symbol":"IBM","price":108.1},
    {"date":"2008-07-01","symbol":"IBM","price":94.4},
    {"date":"2008-08-01","symbol":"IBM","price":77.3},
    {"date":"2008-09-01","symbol":"IBM","price":62.1},
    {"date":"2008-10-01","symbol":"IBM","price":52.2},
    {"date":"2008-11-01","symbol":"IBM","price":47.1},
    {"date":"2008-12-01","symbol":"IBM","price":39.7},
    {"date":"2009-01-01","symbol":"IBM","price":33.0},
    {"date":"2009-02-01","symbol":"IBM","price":32.2},
    {"date":"2009-03-01","symbol":"IBM","price":30.4},
    {"date":"2009-04-01","symbol":"IBM","price":30.4},
    {"date":"2009-05-01","symbol":"IBM","price":29.2},
    {"date":"2009-06-01","symbol":"IBM","price":29.8},
    {"date":"2009-07-01","symbol":"IBM","price":27.1},
    {"date":"2009-08-01","symbol":"IBM","price":27.7},
    {"date":"2009-09-01","symbol":"IBM","price":27.1},
    {"date":"2009-10-01","symbol":"IBM","price":25.2},
    {"date":"2009-11-01","symbol":"IBM","price":26.0},
    {"date":"2009-12-01","symbol":"IBM","price":25.9},
    {"date":"2004-01-01","symbol":"MSFT","price":22.8},
    {"date":"2004-02-01","symbol":"MSFT","price":22.1},
    {"date":"2004-03-01","symbol":"MSFT","price":22.4},
    {"date":"2004-04-01","symbol":"MSFT","price":22.0},
    {"date":"2004-05-01","symbol":"MSFT","price":22.7},
    {"date":"2004-06-01","symbol":"MSFT","price":23.5},
    {"date":"2004-07-01","symbol":"MSFT","price":24.1},
    {"date":"2004-08-01","symbol":"MSFT","price":24.5},
    {"date":"2004-09-01","symbol":"MSFT","price":25.8},
    {"date":"2004-10-01","symbol":"MSFT","price":26.6},
    {"date":"2004-11-01","symbol":"MSFT","price":27.1},
    {"date":"2004-12-01","symbol":"MSFT","price":24.9},
    {"date":"2005-01-01","symbol":"MSFT","price":25.9},
    {"date":"2005-02-01","symbol":"MSFT","price":27.3},
    {"date":"2005-03-01","symbol":"MSFT","price":27.0},
    {"date":"2005-04-01","symbol":"MSFT","price":26.5},
    {"date":"2005-05-01","symbol":"MSFT","price":28.6},
    {"date":"2005-06-01","symbol":"MSFT","price":26.7},
    {"date":"2005-07-01","symbol":"MSFT","price":27.2},
    {"date":"2005-08-01","symbol":"MSFT","price":29.9},
    {"date":"2005-09-01","symbol":"MSFT","price":28.9},
    {"date":"2005-10-01","symbol":"MSFT","price":29.7},
    {"date":"2005-11-01","symbol":"MSFT","price":32.0},
    {"date":"2005-12-01","symbol":"MSFT","price":32.0},
    {"date":"2006-01-01","symbol":"MSFT","price":32.7},
    {"date":"2006-02-01","symbol":"MSFT","price":34.0},
    {"date":"2006-03-01","symbol":"MSFT","price":32.8},
    {"date":"2006-04-01","symbol":"MSFT","price":32.8},
    {"date":"2006-05-01","symbol":"MSFT","price":33.2},
    {"date":"2006-06-01","symbol":"MSFT","price":34.4},
    {"date":"2006-07-01","symbol":"MSFT","price":34.4},
    {"date":"2006-08-01","symbol":"MSFT","price":34.2},
    {"date":"2006-09-01","symbol":"MSFT","price":32.9},
    {"date":"2006-10-01","symbol":"MSFT","price":32.5},
    {"date":"2006-11-01","symbol":"MSFT","price":33.7},
    {"date":"2006-12-01","symbol":"MSFT","price":33.9},
    {"date":"2007-01-01","symbol":"MSFT","price":32.8},
    {"date":"2007-02-01","symbol":"MSFT","price":31.8},
    {"date":"2007-03-01","symbol":"MSFT","price":35.2},
    {"date":"2007-04-01","symbol":"MSFT","price":36.9},
    {"date":"2007-05-01","symbol":"MSFT","price":37.9},
    {"date":"2007-06-01","symbol":"MSFT","price":34.1},
    {"date":"2007-07-01","symbol":"MSFT","price":35.0},
    {"date":"2007-08-01","symbol":"MSFT","price":35.7},
    {"date":"2007-09-01","symbol":"MSFT","price":38.2},
    {"date":"2007-10-01","symbol":"MSFT","price":38.9},
    {"date":"2007-11-01","symbol":"MSFT","price":38.9},
    {"date":"2007-12-01","symbol":"MSFT","price":39.8},
    {"date":"2008-01-01","symbol":"MSFT","price":36.8},
    {"date":"2008-02-01","symbol":"MSFT","price":38.4},
    {"date":"2008-03-01","symbol":"MSFT","price":38.9},
    {"date":"2008-04-01","symbol":"MSFT","price":37.9},
    {"date":"2008-05-01","symbol":"MSFT","price":34.7},
    {"date":"2008-06-01","symbol":"MSFT","price":32.4},
    {"date":"2008-07-01","symbol":"MSFT","price":26.1},
    {"date":"2008-08-01","symbol":"MSFT","price":21.8},
    {"date":"2008-09-01","symbol":"MSFT","price":19.1},
    {"date":"2008-10-01","symbol":"MSFT","price":16.6},
    {"date":"2008-11-01","symbol":"MSFT","price":14.0},
    {"date":"2008-12-01","symbol":"MSFT","price":11.5},
    {"date":"2009-01-01","symbol":"MSFT","price":10.9},
    {"date":"2009-02-01","symbol":"MSFT","price":11.4},
    {"date":"2009-03-01","symbol":"MSFT","price":10.9},
    {"date":"2009-04-01","symbol":"MSFT","price":10.3},
    {"date":"2009-05-01","symbol":"MSFT","price":11.0},
    {"date":"2009-06-01","symbol":"MSFT","price":11.5},
    {"date":"2009-07-01","symbol":"MSFT","price":12.4},
    {"date":"2009-08-01","symbol":"MSFT","price":12.8},
    {"date":"2009-09-01","symbol":"MSFT","price":12.4},
    {"date":"2009-10-01","symbol":"MSFT","price":12.5},
    {"date":"2009-11-01","symbol":"MSFT","price":11.5},
    {"date":"2009-12-01","symbol":"MSFT","price":11.1}
  ]}, "encoding": {"x": {"field": "date", "type": "temporal", "title": null}, "y": {"field": "price", "type": "quantitative", "title": "Price"}, "detail": {"field": "symbol"}}, "layer": [{"mark": {"type": "line", "stroke": "var(--pele-bg)", "strokeWidth": 5}}, {"mark": "line", "encoding": {"color": {"field": "symbol", "title": "Symbol"}}}]}
```

A normalized stacked area chart, with each band a share of the total:

```vega-lite
{"data": {"values": [
    {"date":"2000-01-01","industry":"Agriculture","jobs":79},
    {"date":"2000-03-01","industry":"Agriculture","jobs":82},
    {"date":"2000-05-01","industry":"Agriculture","jobs":85},
    {"date":"2000-07-01","industry":"Agriculture","jobs":86},
    {"date":"2000-09-01","industry":"Agriculture","jobs":87},
    {"date":"2000-11-01","industry":"Agriculture","jobs":86},
    {"date":"2001-01-01","industry":"Agriculture","jobs":84},
    {"date":"2001-03-01","industry":"Agriculture","jobs":87},
    {"date":"2001-05-01","industry":"Agriculture","jobs":83},
    {"date":"2001-07-01","industry":"Agriculture","jobs":79},
    {"date":"2001-09-01","industry":"Agriculture","jobs":78},
    {"date":"2001-11-01","industry":"Agriculture","jobs":79},
    {"date":"2002-01-01","industry":"Agriculture","jobs":76},
    {"date":"2002-03-01","industry":"Agriculture","jobs":75},
    {"date":"2002-05-01","industry":"Agriculture","jobs":73},
    {"date":"2002-07-01","industry":"Agriculture","jobs":71},
    {"date":"2002-09-01","industry":"Agriculture","jobs":68},
    {"date":"2002-11-01","industry":"Agriculture","jobs":62},
    {"date":"2003-01-01","industry":"Agriculture","jobs":66},
    {"date":"2003-03-01","industry":"Agriculture","jobs":67},
    {"date":"2003-05-01","industry":"Agriculture","jobs":63},
    {"date":"2003-07-01","industry":"Agriculture","jobs":60},
    {"date":"2003-09-01","industry":"Agriculture","jobs":61},
    {"date":"2003-11-01","industry":"Agriculture","jobs":56},
    {"date":"2004-01-01","industry":"Agriculture","jobs":52},
    {"date":"2004-03-01","industry":"Agriculture","jobs":60},
    {"date":"2004-05-01","industry":"Agriculture","jobs":57},
    {"date":"2004-07-01","industry":"Agriculture","jobs":64},
    {"date":"2004-09-01","industry":"Agriculture","jobs":59},
    {"date":"2004-11-01","industry":"Agriculture","jobs":55},
    {"date":"2005-01-01","industry":"Agriculture","jobs":62},
    {"date":"2005-03-01","industry":"Agriculture","jobs":73},
    {"date":"2005-05-01","industry":"Agriculture","jobs":69},
    {"date":"2005-07-01","industry":"Agriculture","jobs":67},
    {"date":"2005-09-01","industry":"Agriculture","jobs":71},
    {"date":"2005-11-01","industry":"Agriculture","jobs":78},
    {"date":"2006-01-01","industry":"Agriculture","jobs":80},
    {"date":"2006-03-01","industry":"Agriculture","jobs":81},
    {"date":"2006-05-01","industry":"Agriculture","jobs":87},
    {"date":"2006-07-01","industry":"Agriculture","jobs":86},
    {"date":"2006-09-01","industry":"Agriculture","jobs":84},
    {"date":"2006-11-01","industry":"Agriculture","jobs":87},
    {"date":"2007-01-01","industry":"Agriculture","jobs":91},
    {"date":"2007-03-01","industry":"Agriculture","jobs":89},
    {"date":"2007-05-01","industry":"Agriculture","jobs":88},
    {"date":"2007-07-01","industry":"Agriculture","jobs":80},
    {"date":"2007-09-01","industry":"Agriculture","jobs":82},
    {"date":"2007-11-01","industry":"Agriculture","jobs":84},
    {"date":"2008-01-01","industry":"Agriculture","jobs":79},
    {"date":"2008-03-01","industry":"Agriculture","jobs":82},
    {"date":"2008-05-01","industry":"Agriculture","jobs":78},
    {"date":"2008-07-01","industry":"Agriculture","jobs":77},
    {"date":"2008-09-01","industry":"Agriculture","jobs":71},
    {"date":"2008-11-01","industry":"Agriculture","jobs":79},
    {"date":"2009-01-01","industry":"Agriculture","jobs":72},
    {"date":"2009-03-01","industry":"Agriculture","jobs":65},
    {"date":"2009-05-01","industry":"Agriculture","jobs":64},
    {"date":"2009-07-01","industry":"Agriculture","jobs":72},
    {"date":"2009-09-01","industry":"Agriculture","jobs":60},
    {"date":"2009-11-01","industry":"Agriculture","jobs":63},
    {"date":"2000-01-01","industry":"Construction","jobs":43},
    {"date":"2000-03-01","industry":"Construction","jobs":45},
    {"date":"2000-05-01","industry":"Construction","jobs":44},
    {"date":"2000-07-01","industry":"Construction","jobs":45},
    {"date":"2000-09-01","industry":"Construction","jobs":43},
    {"date":"2000-11-01","industry":"Construction","jobs":40},
    {"date":"2001-01-01","industry":"Construction","jobs":41},
    {"date":"2001-03-01","industry":"Construction","jobs":39},
    {"date":"2001-05-01","industry":"Construction","jobs":37},
    {"date":"2001-07-01","industry":"Construction","jobs":36},
    {"date":"2001-09-01","industry":"Construction","jobs":34},
    {"date":"2001-11-01","industry":"Construction","jobs":36},
    {"date":"2002-01-01","industry":"Construction","jobs":31},
    {"date":"2002-03-01","industry":"Construction","jobs":32},
    {"date":"2002-05-01","industry":"Construction","jobs":33},
    {"date":"2002-07-01","industry":"Construction","jobs":30},
    {"date":"2002-09-01","industry":"Construction","jobs":32},
    {"date":"2002-11-01","industry":"Construction","jobs":29},
    {"date":"2003-01-01","industry":"Construction","jobs":33},
    {"date":"2003-03-01","industry":"Construction","jobs":36},
    {"date":"2003-05-01","industry":"Construction","jobs":37},
    {"date":"2003-07-01","industry":"Construction","jobs":37},
    {"date":"2003-09-01","industry":"Construction","jobs":37},
    {"date":"2003-11-01","industry":"Construction","jobs":36},
    {"date":"2004-01-01","industry":"Construction","jobs":44},
    {"date":"2004-03-01","industry":"Construction","jobs":42},
    {"date":"2004-05-01","industry":"Construction","jobs":45},
    {"date":"2004-07-01","industry":"Construction","jobs":42},
    {"date":"2004-09-01","industry":"Construction","jobs":44},
    {"date":"2004-11-01","industry":"Construction","jobs":42},
    {"date":"2005-01-01","industry":"Construction","jobs":48},
    {"date":"2005-03-01","industry":"Construction","jobs":49},
    {"date":"2005-05-01","industry":"Construction","jobs":43},
    {"date":"2005-07-01","industry":"Construction","jobs":47},
    {"date":"2005-09-01","industry":"Construction","jobs":49},
    {"date":"2005-11-01","industry":"Construction","jobs":44},
    {"date":"2006-01-01","industry":"Construction","jobs":43},
    {"date":"2006-03-01","industry":"Construction","jobs":44},
    {"date":"2006-05-01","industry":"Construction","jobs":44},
    {"date":"2006-07-01","industry":"Construction","jobs":42},
    {"date":"2006-09-01","industry":"Construction","jobs":43},
    {"date":"2006-11-01","industry":"Construction","jobs":43},
    {"date":"2007-01-01","industry":"Construction","jobs":42},
    {"date":"2007-03-01","industry":"Construction","jobs":41},
    {"date":"2007-05-01","industry":"Construction","jobs":42},
    {"date":"2007-07-01","industry":"Construction","jobs":40},
    {"date":"2007-09-01","industry":"Construction","jobs":34},
    {"date":"2007-11-01","industry":"Construction","jobs":34},
    {"date":"2008-01-01","industry":"Construction","jobs":33},
    {"date":"2008-03-01","industry":"Construction","jobs":32},
    {"date":"2008-05-01","industry":"Construction","jobs":33},
    {"date":"2008-07-01","industry":"Construction","jobs":33},
    {"date":"2008-09-01","industry":"Construction","jobs":34},
    {"date":"2008-11-01","industry":"Construction","jobs":30},
    {"date":"2009-01-01","industry":"Construction","jobs":31},
    {"date":"2009-03-01","industry":"Construction","jobs":34},
    {"date":"2009-05-01","industry":"Construction","jobs":34},
    {"date":"2009-07-01","industry":"Construction","jobs":34},
    {"date":"2009-09-01","industry":"Construction","jobs":36},
    {"date":"2009-11-01","industry":"Construction","jobs":36},
    {"date":"2000-01-01","industry":"Education","jobs":58},
    {"date":"2000-03-01","industry":"Education","jobs":56},
    {"date":"2000-05-01","industry":"Education","jobs":57},
    {"date":"2000-07-01","industry":"Education","jobs":50},
    {"date":"2000-09-01","industry":"Education","jobs":53},
    {"date":"2000-11-01","industry":"Education","jobs":55},
    {"date":"2001-01-01","industry":"Education","jobs":50},
    {"date":"2001-03-01","industry":"Education","jobs":53},
    {"date":"2001-05-01","industry":"Education","jobs":51},
    {"date":"2001-07-01","industry":"Education","jobs":46},
    {"date":"2001-09-01","industry":"Education","jobs":47},
    {"date":"2001-11-01","industry":"Education","jobs":46},
    {"date":"2002-01-01","industry":"Education","jobs":46},
    {"date":"2002-03-01","industry":"Education","jobs":45},
    {"date":"2002-05-01","industry":"Education","jobs":43},
    {"date":"2002-07-01","industry":"Education","jobs":40},
    {"date":"2002-09-01","industry":"Education","jobs":41},
    {"date":"2002-11-01","industry":"Education","jobs":40},
    {"date":"2003-01-01","industry":"Education","jobs":42},
    {"date":"2003-03-01","industry":"Education","jobs":41},
    {"date":"2003-05-01","industry":"Education","jobs":39},
    {"date":"2003-07-01","industry":"Education","jobs":37},
    {"date":"2003-09-01","industry":"Education","jobs":41},
    {"date":"2003-11-01","industry":"Education","jobs":40},
    {"date":"2004-01-01","industry":"Education","jobs":41},
    {"date":"2004-03-01","industry":"Education","jobs":44},
    {"date":"2004-05-01","industry":"Education","jobs":45},
    {"date":"2004-07-01","industry":"Education","jobs":48},
    {"date":"2004-09-01","industry":"Education","jobs":50},
    {"date":"2004-11-01","industry":"Education","jobs":49},
    {"date":"2005-01-01","industry":"Education","jobs":57},
    {"date":"2005-03-01","industry":"Education","jobs":52},
    {"date":"2005-05-01","industry":"Education","jobs":57},
    {"date":"2005-07-01","industry":"Education","jobs":56},
    {"date":"2005-09-01","industry":"Education","jobs":59},
    {"date":"2005-11-01","industry":"Education","jobs":51},
    {"date":"2006-01-01","industry":"Education","jobs":56},
    {"date":"2006-03-01","industry":"Education","jobs":58},
    {"date":"2006-05-01","industry":"Education","jobs":59},
    {"date":"2006-07-01","industry":"Education","jobs":63},
    {"date":"2006-09-01","industry":"Education","jobs":58},
    {"date":"2006-11-01","industry":"Education","jobs":59},
    {"date":"2007-01-01","industry":"Education","jobs":57},
    {"date":"2007-03-01","industry":"Education","jobs":57},
    {"date":"2007-05-01","industry":"Education","jobs":54},
    {"date":"2007-07-01","industry":"Education","jobs":51},
    {"date":"2007-09-01","industry":"Education","jobs":52},
    {"date":"2007-11-01","industry":"Education","jobs":46},
    {"date":"2008-01-01","industry":"Education","jobs":50},
    {"date":"2008-03-01","industry":"Education","jobs":44},
    {"date":"2008-05-01","industry":"Education","jobs":45},
    {"date":"2008-07-01","industry":"Education","jobs":49},
    {"date":"2008-09-01","industry":"Education","jobs":42},
    {"date":"2008-11-01","industry":"Education","jobs":42},
    {"date":"2009-01-01","industry":"Education","jobs":44},
    {"date":"2009-03-01","industry":"Education","jobs":40},
    {"date":"2009-05-01","industry":"Education","jobs":38},
    {"date":"2009-07-01","industry":"Education","jobs":41},
    {"date":"2009-09-01","industry":"Education","jobs":42},
    {"date":"2009-11-01","industry":"Education","jobs":43},
    {"date":"2000-01-01","industry":"Finance","jobs":71},
    {"date":"2000-03-01","industry":"Finance","jobs":66},
    {"date":"2000-05-01","industry":"Finance","jobs":68},
    {"date":"2000-07-01","industry":"Finance","jobs":67},
    {"date":"2000-09-01","industry":"Finance","jobs":76},
    {"date":"2000-11-01","industry":"Finance","jobs":70},
    {"date":"2001-01-01","industry":"Finance","jobs":77},
    {"date":"2001-03-01","industry":"Finance","jobs":75},
    {"date":"2001-05-01","industry":"Finance","jobs":77},
    {"date":"2001-07-01","industry":"Finance","jobs":84},
    {"date":"2001-09-01","industry":"Finance","jobs":89},
    {"date":"2001-11-01","industry":"Finance","jobs":86},
    {"date":"2002-01-01","industry":"Finance","jobs":85},
    {"date":"2002-03-01","industry":"Finance","jobs":92},
    {"date":"2002-05-01","industry":"Finance","jobs":90},
    {"date":"2002-07-01","industry":"Finance","jobs":92},
    {"date":"2002-09-01","industry":"Finance","jobs":98},
    {"date":"2002-11-01","industry":"Finance","jobs":96},
    {"date":"2003-01-01","industry":"Finance","jobs":90},
    {"date":"2003-03-01","industry":"Finance","jobs":100},
    {"date":"2003-05-01","industry":"Finance","jobs":90},
    {"date":"2003-07-01","industry":"Finance","jobs":92},
    {"date":"2003-09-01","industry":"Finance","jobs":85},
    {"date":"2003-11-01","industry":"Finance","jobs":85},
    {"date":"2004-01-01","industry":"Finance","jobs":76},
    {"date":"2004-03-01","industry":"Finance","jobs":88},
    {"date":"2004-05-01","industry":"Finance","jobs":84},
    {"date":"2004-07-01","industry":"Finance","jobs":72},
    {"date":"2004-09-01","industry":"Finance","jobs":68},
    {"date":"2004-11-01","industry":"Finance","jobs":66},
    {"date":"2005-01-01","industry":"Finance","jobs":74},
    {"date":"2005-03-01","industry":"Finance","jobs":66},
    {"date":"2005-05-01","industry":"Finance","jobs":66},
    {"date":"2005-07-01","industry":"Finance","jobs":64},
    {"date":"2005-09-01","industry":"Finance","jobs":64},
    {"date":"2005-11-01","industry":"Finance","jobs":60},
    {"date":"2006-01-01","industry":"Finance","jobs":64},
    {"date":"2006-03-01","industry":"Finance","jobs":59},
    {"date":"2006-05-01","industry":"Finance","jobs":65},
    {"date":"2006-07-01","industry":"Finance","jobs":67},
    {"date":"2006-09-01","industry":"Finance","jobs":69},
    {"date":"2006-11-01","industry":"Finance","jobs":68},
    {"date":"2007-01-01","industry":"Finance","jobs":67},
    {"date":"2007-03-01","industry":"Finance","jobs":74},
    {"date":"2007-05-01","industry":"Finance","jobs":73},
    {"date":"2007-07-01","industry":"Finance","jobs":84},
    {"date":"2007-09-01","industry":"Finance","jobs":83},
    {"date":"2007-11-01","industry":"Finance","jobs":82},
    {"date":"2008-01-01","industry":"Finance","jobs":83},
    {"date":"2008-03-01","industry":"Finance","jobs":84},
    {"date":"2008-05-01","industry":"Finance","jobs":84},
    {"date":"2008-07-01","industry":"Finance","jobs":88},
    {"date":"2008-09-01","industry":"Finance","jobs":92},
    {"date":"2008-11-01","industry":"Finance","jobs":93},
    {"date":"2009-01-01","industry":"Finance","jobs":94},
    {"date":"2009-03-01","industry":"Finance","jobs":100},
    {"date":"2009-05-01","industry":"Finance","jobs":89},
    {"date":"2009-07-01","industry":"Finance","jobs":91},
    {"date":"2009-09-01","industry":"Finance","jobs":101},
    {"date":"2009-11-01","industry":"Finance","jobs":81},
    {"date":"2000-01-01","industry":"Government","jobs":107},
    {"date":"2000-03-01","industry":"Government","jobs":110},
    {"date":"2000-05-01","industry":"Government","jobs":108},
    {"date":"2000-07-01","industry":"Government","jobs":112},
    {"date":"2000-09-01","industry":"Government","jobs":111},
    {"date":"2000-11-01","industry":"Government","jobs":114},
    {"date":"2001-01-01","industry":"Government","jobs":101},
    {"date":"2001-03-01","industry":"Government","jobs":105},
    {"date":"2001-05-01","industry":"Government","jobs":108},
    {"date":"2001-07-01","industry":"Government","jobs":101},
    {"date":"2001-09-01","industry":"Government","jobs":99},
    {"date":"2001-11-01","industry":"Government","jobs":105},
    {"date":"2002-01-01","industry":"Government","jobs":96},
    {"date":"2002-03-01","industry":"Government","jobs":99},
    {"date":"2002-05-01","industry":"Government","jobs":97},
    {"date":"2002-07-01","industry":"Government","jobs":92},
    {"date":"2002-09-01","industry":"Government","jobs":90},
    {"date":"2002-11-01","industry":"Government","jobs":85},
    {"date":"2003-01-01","industry":"Government","jobs":77},
    {"date":"2003-03-01","industry":"Government","jobs":81},
    {"date":"2003-05-01","industry":"Government","jobs":82},
    {"date":"2003-07-01","industry":"Government","jobs":76},
    {"date":"2003-09-01","industry":"Government","jobs":77},
    {"date":"2003-11-01","industry":"Government","jobs":81},
    {"date":"2004-01-01","industry":"Government","jobs":73},
    {"date":"2004-03-01","industry":"Government","jobs":81},
    {"date":"2004-05-01","industry":"Government","jobs":88},
    {"date":"2004-07-01","industry":"Government","jobs":78},
    {"date":"2004-09-01","industry":"Government","jobs":83},
    {"date":"2004-11-01","industry":"Government","jobs":84},
    {"date":"2005-01-01","industry":"Government","jobs":94},
    {"date":"2005-03-01","industry":"Government","jobs":91},
    {"date":"2005-05-01","industry":"Government","jobs":96},
    {"date":"2005-07-01","industry":"Government","jobs":92},
    {"date":"2005-09-01","industry":"Government","jobs":98},
    {"date":"2005-11-01","industry":"Government","jobs":100},
    {"date":"2006-01-01","industry":"Government","jobs":95},
    {"date":"2006-03-01","industry":"Government","jobs":112},
    {"date":"2006-05-01","industry":"Government","jobs":111},
    {"date":"2006-07-01","industry":"Government","jobs":100},
    {"date":"2006-09-01","industry":"Government","jobs":113},
    {"date":"2006-11-01","industry":"Government","jobs":110},
    {"date":"2007-01-01","industry":"Government","jobs":113},
    {"date":"2007-03-01","industry":"Government","jobs":112},
    {"date":"2007-05-01","industry":"Government","jobs":103},
    {"date":"2007-07-01","industry":"Government","jobs":108},
    {"date":"2007-09-01","industry":"Government","jobs":114},
    {"date":"2007-11-01","industry":"Government","jobs":103},
    {"date":"2008-01-01","industry":"Government","jobs":99},
    {"date":"2008-03-01","industry":"Government","jobs":95},
    {"date":"2008-05-01","industry":"Government","jobs":93},
    {"date":"2008-07-01","industry":"Government","jobs":97},
    {"date":"2008-09-01","industry":"Government","jobs":101},
    {"date":"2008-11-01","industry":"Government","jobs":92},
    {"date":"2009-01-01","industry":"Government","jobs":88},
    {"date":"2009-03-01","industry":"Government","jobs":95},
    {"date":"2009-05-01","industry":"Government","jobs":80},
    {"date":"2009-07-01","industry":"Government","jobs":77},
    {"date":"2009-09-01","industry":"Government","jobs":82},
    {"date":"2009-11-01","industry":"Government","jobs":81},
    {"date":"2000-01-01","industry":"Manufacturing","jobs":100},
    {"date":"2000-03-01","industry":"Manufacturing","jobs":98},
    {"date":"2000-05-01","industry":"Manufacturing","jobs":88},
    {"date":"2000-07-01","industry":"Manufacturing","jobs":94},
    {"date":"2000-09-01","industry":"Manufacturing","jobs":92},
    {"date":"2000-11-01","industry":"Manufacturing","jobs":99},
    {"date":"2001-01-01","industry":"Manufacturing","jobs":97},
    {"date":"2001-03-01","industry":"Manufacturing","jobs":99},
    {"date":"2001-05-01","industry":"Manufacturing","jobs":100},
    {"date":"2001-07-01","industry":"Manufacturing","jobs":111},
    {"date":"2001-09-01","industry":"Manufacturing","jobs":116},
    {"date":"2001-11-01","industry":"Manufacturing","jobs":109},
    {"date":"2002-01-01","industry":"Manufacturing","jobs":119},
    {"date":"2002-03-01","industry":"Manufacturing","jobs":114},
    {"date":"2002-05-01","industry":"Manufacturing","jobs":122},
    {"date":"2002-07-01","industry":"Manufacturing","jobs":129},
    {"date":"2002-09-01","industry":"Manufacturing","jobs":137},
    {"date":"2002-11-01","industry":"Manufacturing","jobs":128},
    {"date":"2003-01-01","industry":"Manufacturing","jobs":132},
    {"date":"2003-03-01","industry":"Manufacturing","jobs":136},
    {"date":"2003-05-01","industry":"Manufacturing","jobs":127},
    {"date":"2003-07-01","industry":"Manufacturing","jobs":137},
    {"date":"2003-09-01","industry":"Manufacturing","jobs":133},
    {"date":"2003-11-01","industry":"Manufacturing","jobs":139},
    {"date":"2004-01-01","industry":"Manufacturing","jobs":130},
    {"date":"2004-03-01","industry":"Manufacturing","jobs":123},
    {"date":"2004-05-01","industry":"Manufacturing","jobs":133},
    {"date":"2004-07-01","industry":"Manufacturing","jobs":132},
    {"date":"2004-09-01","industry":"Manufacturing","jobs":124},
    {"date":"2004-11-01","industry":"Manufacturing","jobs":130},
    {"date":"2005-01-01","industry":"Manufacturing","jobs":120},
    {"date":"2005-03-01","industry":"Manufacturing","jobs":114},
    {"date":"2005-05-01","industry":"Manufacturing","jobs":117},
    {"date":"2005-07-01","industry":"Manufacturing","jobs":102},
    {"date":"2005-09-01","industry":"Manufacturing","jobs":104},
    {"date":"2005-11-01","industry":"Manufacturing","jobs":104},
    {"date":"2006-01-01","industry":"Manufacturing","jobs":107},
    {"date":"2006-03-01","industry":"Manufacturing","jobs":99},
    {"date":"2006-05-01","industry":"Manufacturing","jobs":99},
    {"date":"2006-07-01","industry":"Manufacturing","jobs":93},
    {"date":"2006-09-01","industry":"Manufacturing","jobs":97},
    {"date":"2006-11-01","industry":"Manufacturing","jobs":105},
    {"date":"2007-01-01","industry":"Manufacturing","jobs":92},
    {"date":"2007-03-01","industry":"Manufacturing","jobs":111},
    {"date":"2007-05-01","industry":"Manufacturing","jobs":95},
    {"date":"2007-07-01","industry":"Manufacturing","jobs":100},
    {"date":"2007-09-01","industry":"Manufacturing","jobs":104},
    {"date":"2007-11-01","industry":"Manufacturing","jobs":112},
    {"date":"2008-01-01","industry":"Manufacturing","jobs":101},
    {"date":"2008-03-01","industry":"Manufacturing","jobs":100},
    {"date":"2008-05-01","industry":"Manufacturing","jobs":119},
    {"date":"2008-07-01","industry":"Manufacturing","jobs":124},
    {"date":"2008-09-01","industry":"Manufacturing","jobs":126},
    {"date":"2008-11-01","industry":"Manufacturing","jobs":141},
    {"date":"2009-01-01","industry":"Manufacturing","jobs":130},
    {"date":"2009-03-01","industry":"Manufacturing","jobs":133},
    {"date":"2009-05-01","industry":"Manufacturing","jobs":139},
    {"date":"2009-07-01","industry":"Manufacturing","jobs":137},
    {"date":"2009-09-01","industry":"Manufacturing","jobs":146},
    {"date":"2009-11-01","industry":"Manufacturing","jobs":130},
    {"date":"2000-01-01","industry":"Retail","jobs":126},
    {"date":"2000-03-01","industry":"Retail","jobs":123},
    {"date":"2000-05-01","industry":"Retail","jobs":135},
    {"date":"2000-07-01","industry":"Retail","jobs":146},
    {"date":"2000-09-01","industry":"Retail","jobs":136},
    {"date":"2000-11-01","industry":"Retail","jobs":138},
    {"date":"2001-01-01","industry":"Retail","jobs":140},
    {"date":"2001-03-01","industry":"Retail","jobs":140},
    {"date":"2001-05-01","industry":"Retail","jobs":144},
    {"date":"2001-07-01","industry":"Retail","jobs":153},
    {"date":"2001-09-01","industry":"Retail","jobs":151},
    {"date":"2001-11-01","industry":"Retail","jobs":151},
    {"date":"2002-01-01","industry":"Retail","jobs":150},
    {"date":"2002-03-01","industry":"Retail","jobs":156},
    {"date":"2002-05-01","industry":"Retail","jobs":152},
    {"date":"2002-07-01","industry":"Retail","jobs":146},
    {"date":"2002-09-01","industry":"Retail","jobs":148},
    {"date":"2002-11-01","industry":"Retail","jobs":140},
    {"date":"2003-01-01","industry":"Retail","jobs":130},
    {"date":"2003-03-01","industry":"Retail","jobs":143},
    {"date":"2003-05-01","industry":"Retail","jobs":133},
    {"date":"2003-07-01","industry":"Retail","jobs":120},
    {"date":"2003-09-01","industry":"Retail","jobs":130},
    {"date":"2003-11-01","industry":"Retail","jobs":121},
    {"date":"2004-01-01","industry":"Retail","jobs":106},
    {"date":"2004-03-01","industry":"Retail","jobs":123},
    {"date":"2004-05-01","industry":"Retail","jobs":112},
    {"date":"2004-07-01","industry":"Retail","jobs":114},
    {"date":"2004-09-01","industry":"Retail","jobs":108},
    {"date":"2004-11-01","industry":"Retail","jobs":104},
    {"date":"2005-01-01","industry":"Retail","jobs":95},
    {"date":"2005-03-01","industry":"Retail","jobs":111},
    {"date":"2005-05-01","industry":"Retail","jobs":106},
    {"date":"2005-07-01","industry":"Retail","jobs":106},
    {"date":"2005-09-01","industry":"Retail","jobs":112},
    {"date":"2005-11-01","industry":"Retail","jobs":113},
    {"date":"2006-01-01","industry":"Retail","jobs":120},
    {"date":"2006-03-01","industry":"Retail","jobs":116},
    {"date":"2006-05-01","industry":"Retail","jobs":122},
    {"date":"2006-07-01","industry":"Retail","jobs":112},
    {"date":"2006-09-01","industry":"Retail","jobs":127},
    {"date":"2006-11-01","industry":"Retail","jobs":138},
    {"date":"2007-01-01","industry":"Retail","jobs":146},
    {"date":"2007-03-01","industry":"Retail","jobs":138},
    {"date":"2007-05-01","industry":"Retail","jobs":143},
    {"date":"2007-07-01","industry":"Retail","jobs":156},
    {"date":"2007-09-01","industry":"Retail","jobs":146},
    {"date":"2007-11-01","industry":"Retail","jobs":154},
    {"date":"2008-01-01","industry":"Retail","jobs":161},
    {"date":"2008-03-01","industry":"Retail","jobs":151},
    {"date":"2008-05-01","industry":"Retail","jobs":158},
    {"date":"2008-07-01","industry":"Retail","jobs":145},
    {"date":"2008-09-01","industry":"Retail","jobs":149},
    {"date":"2008-11-01","industry":"Retail","jobs":145},
    {"date":"2009-01-01","industry":"Retail","jobs":144},
    {"date":"2009-03-01","industry":"Retail","jobs":147},
    {"date":"2009-05-01","industry":"Retail","jobs":152},
    {"date":"2009-07-01","industry":"Retail","jobs":129},
    {"date":"2009-09-01","industry":"Retail","jobs":126},
    {"date":"2009-11-01","industry":"Retail","jobs":129},
    {"date":"2000-01-01","industry":"Services","jobs":97},
    {"date":"2000-03-01","industry":"Services","jobs":91},
    {"date":"2000-05-01","industry":"Services","jobs":92},
    {"date":"2000-07-01","industry":"Services","jobs":79},
    {"date":"2000-09-01","industry":"Services","jobs":87},
    {"date":"2000-11-01","industry":"Services","jobs":75},
    {"date":"2001-01-01","industry":"Services","jobs":76},
    {"date":"2001-03-01","industry":"Services","jobs":75},
    {"date":"2001-05-01","industry":"Services","jobs":75},
    {"date":"2001-07-01","industry":"Services","jobs":80},
    {"date":"2001-09-01","industry":"Services","jobs":76},
    {"date":"2001-11-01","industry":"Services","jobs":73},
    {"date":"2002-01-01","industry":"Services","jobs":78},
    {"date":"2002-03-01","industry":"Services","jobs":84},
    {"date":"2002-05-01","industry":"Services","jobs":78},
    {"date":"2002-07-01","industry":"Services","jobs":81},
    {"date":"2002-09-01","industry":"Services","jobs":87},
    {"date":"2002-11-01","industry":"Services","jobs":85},
    {"date":"2003-01-01","industry":"Services","jobs":80},
    {"date":"2003-03-01","industry":"Services","jobs":100},
    {"date":"2003-05-01","industry":"Services","jobs":102},
    {"date":"2003-07-01","industry":"Services","jobs":85},
    {"date":"2003-09-01","industry":"Services","jobs":97},
    {"date":"2003-11-01","industry":"Services","jobs":102},
    {"date":"2004-01-01","industry":"Services","jobs":106},
    {"date":"2004-03-01","industry":"Services","jobs":107},
    {"date":"2004-05-01","industry":"Services","jobs":104},
    {"date":"2004-07-01","industry":"Services","jobs":102},
    {"date":"2004-09-01","industry":"Services","jobs":108},
    {"date":"2004-11-01","industry":"Services","jobs":113},
    {"date":"2005-01-01","industry":"Services","jobs":103},
    {"date":"2005-03-01","industry":"Services","jobs":103},
    {"date":"2005-05-01","industry":"Services","jobs":106},
    {"date":"2005-07-01","industry":"Services","jobs":96},
    {"date":"2005-09-01","industry":"Services","jobs":102},
    {"date":"2005-11-01","industry":"Services","jobs":99},
    {"date":"2006-01-01","industry":"Services","jobs":101},
    {"date":"2006-03-01","industry":"Services","jobs":93},
    {"date":"2006-05-01","industry":"Services","jobs":90},
    {"date":"2006-07-01","industry":"Services","jobs":89},
    {"date":"2006-09-01","industry":"Services","jobs":88},
    {"date":"2006-11-01","industry":"Services","jobs":83},
    {"date":"2007-01-01","industry":"Services","jobs":83},
    {"date":"2007-03-01","industry":"Services","jobs":84},
    {"date":"2007-05-01","industry":"Services","jobs":84},
    {"date":"2007-07-01","industry":"Services","jobs":85},
    {"date":"2007-09-01","industry":"Services","jobs":73},
    {"date":"2007-11-01","industry":"Services","jobs":74},
    {"date":"2008-01-01","industry":"Services","jobs":64},
    {"date":"2008-03-01","industry":"Services","jobs":84},
    {"date":"2008-05-01","industry":"Services","jobs":73},
    {"date":"2008-07-01","industry":"Services","jobs":77},
    {"date":"2008-09-01","industry":"Services","jobs":81},
    {"date":"2008-11-01","industry":"Services","jobs":74},
    {"date":"2009-01-01","industry":"Services","jobs":84},
    {"date":"2009-03-01","industry":"Services","jobs":84},
    {"date":"2009-05-01","industry":"Services","jobs":79},
    {"date":"2009-07-01","industry":"Services","jobs":91},
    {"date":"2009-09-01","industry":"Services","jobs":98},
    {"date":"2009-11-01","industry":"Services","jobs":87}
  ]}, "mark": "area", "encoding": {"x": {"field": "date", "type": "temporal", "title": null}, "y": {"field": "jobs", "type": "quantitative", "stack": "normalize", "title": "Share of jobs", "axis": {"format": "%"}}, "color": {"field": "industry", "title": "Industry"}}}
```

An annual heatmap of generated daily highs, one cell per day:

```vega-lite
{"data": {"values": [
    {"month":"Jan","day":1,"temp":10.5},
    {"month":"Jan","day":2,"temp":8.6},
    {"month":"Jan","day":3,"temp":9.3},
    {"month":"Jan","day":4,"temp":9.1},
    {"month":"Jan","day":5,"temp":11.6},
    {"month":"Jan","day":6,"temp":7.0},
    {"month":"Jan","day":7,"temp":10.2},
    {"month":"Jan","day":8,"temp":6.3},
    {"month":"Jan","day":9,"temp":9.6},
    {"month":"Jan","day":10,"temp":5.0},
    {"month":"Jan","day":11,"temp":7.0},
    {"month":"Jan","day":12,"temp":12.5},
    {"month":"Jan","day":13,"temp":8.6},
    {"month":"Jan","day":14,"temp":6.7},
    {"month":"Jan","day":15,"temp":3.7},
    {"month":"Jan","day":16,"temp":4.8},
    {"month":"Jan","day":17,"temp":7.7},
    {"month":"Jan","day":18,"temp":9.9},
    {"month":"Jan","day":19,"temp":8.3},
    {"month":"Jan","day":20,"temp":8.6},
    {"month":"Jan","day":21,"temp":6.9},
    {"month":"Jan","day":22,"temp":11.1},
    {"month":"Jan","day":23,"temp":5.8},
    {"month":"Jan","day":24,"temp":5.4},
    {"month":"Jan","day":25,"temp":9.7},
    {"month":"Jan","day":26,"temp":7.2},
    {"month":"Jan","day":27,"temp":6.2},
    {"month":"Jan","day":28,"temp":5.3},
    {"month":"Jan","day":29,"temp":6.3},
    {"month":"Jan","day":30,"temp":8.9},
    {"month":"Jan","day":31,"temp":8.1},
    {"month":"Feb","day":1,"temp":3.5},
    {"month":"Feb","day":2,"temp":8.4},
    {"month":"Feb","day":3,"temp":7.7},
    {"month":"Feb","day":4,"temp":4.2},
    {"month":"Feb","day":5,"temp":9.6},
    {"month":"Feb","day":6,"temp":6.5},
    {"month":"Feb","day":7,"temp":6.4},
    {"month":"Feb","day":8,"temp":9.8},
    {"month":"Feb","day":9,"temp":11.4},
    {"month":"Feb","day":10,"temp":5.5},
    {"month":"Feb","day":11,"temp":8.9},
    {"month":"Feb","day":12,"temp":5.1},
    {"month":"Feb","day":13,"temp":14.7},
    {"month":"Feb","day":14,"temp":6.4},
    {"month":"Feb","day":15,"temp":11.5},
    {"month":"Feb","day":16,"temp":6.1},
    {"month":"Feb","day":17,"temp":10.6},
    {"month":"Feb","day":18,"temp":14.9},
    {"month":"Feb","day":19,"temp":0.7},
    {"month":"Feb","day":20,"temp":7.2},
    {"month":"Feb","day":21,"temp":10.1},
    {"month":"Feb","day":22,"temp":8.4},
    {"month":"Feb","day":23,"temp":6.8},
    {"month":"Feb","day":24,"temp":15.4},
    {"month":"Feb","day":25,"temp":9.3},
    {"month":"Feb","day":26,"temp":4.3},
    {"month":"Feb","day":27,"temp":11.9},
    {"month":"Feb","day":28,"temp":4.3},
    {"month":"Mar","day":1,"temp":13.1},
    {"month":"Mar","day":2,"temp":8.0},
    {"month":"Mar","day":3,"temp":10.3},
    {"month":"Mar","day":4,"temp":13.8},
    {"month":"Mar","day":5,"temp":10.5},
    {"month":"Mar","day":6,"temp":6.1},
    {"month":"Mar","day":7,"temp":5.4},
    {"month":"Mar","day":8,"temp":14.2},
    {"month":"Mar","day":9,"temp":13.0},
    {"month":"Mar","day":10,"temp":8.5},
    {"month":"Mar","day":11,"temp":13.7},
    {"month":"Mar","day":12,"temp":12.7},
    {"month":"Mar","day":13,"temp":13.3},
    {"month":"Mar","day":14,"temp":4.8},
    {"month":"Mar","day":15,"temp":10.8},
    {"month":"Mar","day":16,"temp":14.6},
    {"month":"Mar","day":17,"temp":14.3},
    {"month":"Mar","day":18,"temp":14.9},
    {"month":"Mar","day":19,"temp":5.1},
    {"month":"Mar","day":20,"temp":13.1},
    {"month":"Mar","day":21,"temp":14.3},
    {"month":"Mar","day":22,"temp":20.6},
    {"month":"Mar","day":23,"temp":10.3},
    {"month":"Mar","day":24,"temp":12.4},
    {"month":"Mar","day":25,"temp":13.6},
    {"month":"Mar","day":26,"temp":16.4},
    {"month":"Mar","day":27,"temp":12.6},
    {"month":"Mar","day":28,"temp":17.6},
    {"month":"Mar","day":29,"temp":12.0},
    {"month":"Mar","day":30,"temp":15.3},
    {"month":"Mar","day":31,"temp":13.1},
    {"month":"Apr","day":1,"temp":15.4},
    {"month":"Apr","day":2,"temp":13.1},
    {"month":"Apr","day":3,"temp":10.5},
    {"month":"Apr","day":4,"temp":18.8},
    {"month":"Apr","day":5,"temp":16.7},
    {"month":"Apr","day":6,"temp":14.3},
    {"month":"Apr","day":7,"temp":16.8},
    {"month":"Apr","day":8,"temp":19.4},
    {"month":"Apr","day":9,"temp":13.7},
    {"month":"Apr","day":10,"temp":16.5},
    {"month":"Apr","day":11,"temp":18.7},
    {"month":"Apr","day":12,"temp":18.9},
    {"month":"Apr","day":13,"temp":16.5},
    {"month":"Apr","day":14,"temp":11.4},
    {"month":"Apr","day":15,"temp":21.7},
    {"month":"Apr","day":16,"temp":19.2},
    {"month":"Apr","day":17,"temp":18.5},
    {"month":"Apr","day":18,"temp":17.8},
    {"month":"Apr","day":19,"temp":19.7},
    {"month":"Apr","day":20,"temp":17.8},
    {"month":"Apr","day":21,"temp":16.2},
    {"month":"Apr","day":22,"temp":17.3},
    {"month":"Apr","day":23,"temp":18.0},
    {"month":"Apr","day":24,"temp":18.2},
    {"month":"Apr","day":25,"temp":16.8},
    {"month":"Apr","day":26,"temp":22.4},
    {"month":"Apr","day":27,"temp":16.8},
    {"month":"Apr","day":28,"temp":22.9},
    {"month":"Apr","day":29,"temp":18.1},
    {"month":"Apr","day":30,"temp":22.4},
    {"month":"May","day":1,"temp":25.7},
    {"month":"May","day":2,"temp":22.4},
    {"month":"May","day":3,"temp":19.8},
    {"month":"May","day":4,"temp":22.4},
    {"month":"May","day":5,"temp":22.9},
    {"month":"May","day":6,"temp":17.5},
    {"month":"May","day":7,"temp":21.1},
    {"month":"May","day":8,"temp":23.6},
    {"month":"May","day":9,"temp":21.9},
    {"month":"May","day":10,"temp":23.8},
    {"month":"May","day":11,"temp":25.9},
    {"month":"May","day":12,"temp":26.2},
    {"month":"May","day":13,"temp":26.9},
    {"month":"May","day":14,"temp":26.1},
    {"month":"May","day":15,"temp":23.7},
    {"month":"May","day":16,"temp":24.7},
    {"month":"May","day":17,"temp":24.2},
    {"month":"May","day":18,"temp":24.2},
    {"month":"May","day":19,"temp":24.8},
    {"month":"May","day":20,"temp":20.4},
    {"month":"May","day":21,"temp":24.8},
    {"month":"May","day":22,"temp":25.9},
    {"month":"May","day":23,"temp":23.2},
    {"month":"May","day":24,"temp":26.3},
    {"month":"May","day":25,"temp":28.1},
    {"month":"May","day":26,"temp":26.2},
    {"month":"May","day":27,"temp":33.1},
    {"month":"May","day":28,"temp":19.3},
    {"month":"May","day":29,"temp":26.7},
    {"month":"May","day":30,"temp":22.0},
    {"month":"May","day":31,"temp":30.6},
    {"month":"Jun","day":1,"temp":35.8},
    {"month":"Jun","day":2,"temp":20.5},
    {"month":"Jun","day":3,"temp":28.6},
    {"month":"Jun","day":4,"temp":29.9},
    {"month":"Jun","day":5,"temp":27.6},
    {"month":"Jun","day":6,"temp":30.4},
    {"month":"Jun","day":7,"temp":22.1},
    {"month":"Jun","day":8,"temp":31.6},
    {"month":"Jun","day":9,"temp":30.3},
    {"month":"Jun","day":10,"temp":29.4},
    {"month":"Jun","day":11,"temp":27.7},
    {"month":"Jun","day":12,"temp":31.6},
    {"month":"Jun","day":13,"temp":28.4},
    {"month":"Jun","day":14,"temp":30.6},
    {"month":"Jun","day":15,"temp":28.6},
    {"month":"Jun","day":16,"temp":23.5},
    {"month":"Jun","day":17,"temp":30.3},
    {"month":"Jun","day":18,"temp":31.1},
    {"month":"Jun","day":19,"temp":32.9},
    {"month":"Jun","day":20,"temp":28.1},
    {"month":"Jun","day":21,"temp":30.8},
    {"month":"Jun","day":22,"temp":32.9},
    {"month":"Jun","day":23,"temp":31.6},
    {"month":"Jun","day":24,"temp":35.0},
    {"month":"Jun","day":25,"temp":37.3},
    {"month":"Jun","day":26,"temp":28.8},
    {"month":"Jun","day":27,"temp":25.8},
    {"month":"Jun","day":28,"temp":34.3},
    {"month":"Jun","day":29,"temp":36.4},
    {"month":"Jun","day":30,"temp":34.6},
    {"month":"Jul","day":1,"temp":34.4},
    {"month":"Jul","day":2,"temp":30.2},
    {"month":"Jul","day":3,"temp":30.0},
    {"month":"Jul","day":4,"temp":34.9},
    {"month":"Jul","day":5,"temp":29.5},
    {"month":"Jul","day":6,"temp":26.9},
    {"month":"Jul","day":7,"temp":29.4},
    {"month":"Jul","day":8,"temp":40.0},
    {"month":"Jul","day":9,"temp":38.3},
    {"month":"Jul","day":10,"temp":30.5},
    {"month":"Jul","day":11,"temp":30.5},
    {"month":"Jul","day":12,"temp":33.4},
    {"month":"Jul","day":13,"temp":30.5},
    {"month":"Jul","day":14,"temp":36.7},
    {"month":"Jul","day":15,"temp":32.6},
    {"month":"Jul","day":16,"temp":29.6},
    {"month":"Jul","day":17,"temp":36.8},
    {"month":"Jul","day":18,"temp":31.2},
    {"month":"Jul","day":19,"temp":33.6},
    {"month":"Jul","day":20,"temp":32.9},
    {"month":"Jul","day":21,"temp":32.0},
    {"month":"Jul","day":22,"temp":34.0},
    {"month":"Jul","day":23,"temp":30.9},
    {"month":"Jul","day":24,"temp":27.5},
    {"month":"Jul","day":25,"temp":26.4},
    {"month":"Jul","day":26,"temp":29.2},
    {"month":"Jul","day":27,"temp":30.7},
    {"month":"Jul","day":28,"temp":32.9},
    {"month":"Jul","day":29,"temp":33.1},
    {"month":"Jul","day":30,"temp":34.6},
    {"month":"Jul","day":31,"temp":33.3},
    {"month":"Aug","day":1,"temp":30.5},
    {"month":"Aug","day":2,"temp":30.7},
    {"month":"Aug","day":3,"temp":26.5},
    {"month":"Aug","day":4,"temp":32.3},
    {"month":"Aug","day":5,"temp":34.2},
    {"month":"Aug","day":6,"temp":34.3},
    {"month":"Aug","day":7,"temp":32.3},
    {"month":"Aug","day":8,"temp":32.1},
    {"month":"Aug","day":9,"temp":35.4},
    {"month":"Aug","day":10,"temp":32.6},
    {"month":"Aug","day":11,"temp":34.7},
    {"month":"Aug","day":12,"temp":34.1},
    {"month":"Aug","day":13,"temp":33.0},
    {"month":"Aug","day":14,"temp":36.2},
    {"month":"Aug","day":15,"temp":30.5},
    {"month":"Aug","day":16,"temp":31.0},
    {"month":"Aug","day":17,"temp":29.6},
    {"month":"Aug","day":18,"temp":29.5},
    {"month":"Aug","day":19,"temp":36.5},
    {"month":"Aug","day":20,"temp":37.0},
    {"month":"Aug","day":21,"temp":31.7},
    {"month":"Aug","day":22,"temp":33.3},
    {"month":"Aug","day":23,"temp":35.0},
    {"month":"Aug","day":24,"temp":33.8},
    {"month":"Aug","day":25,"temp":34.9},
    {"month":"Aug","day":26,"temp":27.3},
    {"month":"Aug","day":27,"temp":29.1},
    {"month":"Aug","day":28,"temp":32.2},
    {"month":"Aug","day":29,"temp":35.1},
    {"month":"Aug","day":30,"temp":31.0},
    {"month":"Aug","day":31,"temp":27.9},
    {"month":"Sep","day":1,"temp":29.3},
    {"month":"Sep","day":2,"temp":28.3},
    {"month":"Sep","day":3,"temp":27.5},
    {"month":"Sep","day":4,"temp":34.5},
    {"month":"Sep","day":5,"temp":27.9},
    {"month":"Sep","day":6,"temp":29.7},
    {"month":"Sep","day":7,"temp":36.0},
    {"month":"Sep","day":8,"temp":32.9},
    {"month":"Sep","day":9,"temp":30.2},
    {"month":"Sep","day":10,"temp":27.2},
    {"month":"Sep","day":11,"temp":30.1},
    {"month":"Sep","day":12,"temp":33.6},
    {"month":"Sep","day":13,"temp":30.4},
    {"month":"Sep","day":14,"temp":32.1},
    {"month":"Sep","day":15,"temp":28.5},
    {"month":"Sep","day":16,"temp":29.6},
    {"month":"Sep","day":17,"temp":27.2},
    {"month":"Sep","day":18,"temp":28.9},
    {"month":"Sep","day":19,"temp":31.4},
    {"month":"Sep","day":20,"temp":23.0},
    {"month":"Sep","day":21,"temp":26.9},
    {"month":"Sep","day":22,"temp":27.6},
    {"month":"Sep","day":23,"temp":25.0},
    {"month":"Sep","day":24,"temp":25.6},
    {"month":"Sep","day":25,"temp":28.7},
    {"month":"Sep","day":26,"temp":32.1},
    {"month":"Sep","day":27,"temp":27.8},
    {"month":"Sep","day":28,"temp":26.7},
    {"month":"Sep","day":29,"temp":20.8},
    {"month":"Sep","day":30,"temp":31.1},
    {"month":"Oct","day":1,"temp":25.3},
    {"month":"Oct","day":2,"temp":24.8},
    {"month":"Oct","day":3,"temp":21.3},
    {"month":"Oct","day":4,"temp":24.3},
    {"month":"Oct","day":5,"temp":21.0},
    {"month":"Oct","day":6,"temp":24.3},
    {"month":"Oct","day":7,"temp":25.2},
    {"month":"Oct","day":8,"temp":23.7},
    {"month":"Oct","day":9,"temp":24.3},
    {"month":"Oct","day":10,"temp":20.7},
    {"month":"Oct","day":11,"temp":27.3},
    {"month":"Oct","day":12,"temp":20.8},
    {"month":"Oct","day":13,"temp":17.1},
    {"month":"Oct","day":14,"temp":21.8},
    {"month":"Oct","day":15,"temp":19.9},
    {"month":"Oct","day":16,"temp":18.9},
    {"month":"Oct","day":17,"temp":20.6},
    {"month":"Oct","day":18,"temp":22.4},
    {"month":"Oct","day":19,"temp":17.7},
    {"month":"Oct","day":20,"temp":20.6},
    {"month":"Oct","day":21,"temp":25.1},
    {"month":"Oct","day":22,"temp":22.7},
    {"month":"Oct","day":23,"temp":19.9},
    {"month":"Oct","day":24,"temp":20.6},
    {"month":"Oct","day":25,"temp":19.6},
    {"month":"Oct","day":26,"temp":19.6},
    {"month":"Oct","day":27,"temp":21.7},
    {"month":"Oct","day":28,"temp":19.0},
    {"month":"Oct","day":29,"temp":11.9},
    {"month":"Oct","day":30,"temp":18.8},
    {"month":"Oct","day":31,"temp":16.0},
    {"month":"Nov","day":1,"temp":20.4},
    {"month":"Nov","day":2,"temp":16.4},
    {"month":"Nov","day":3,"temp":18.4},
    {"month":"Nov","day":4,"temp":24.3},
    {"month":"Nov","day":5,"temp":14.4},
    {"month":"Nov","day":6,"temp":13.9},
    {"month":"Nov","day":7,"temp":12.8},
    {"month":"Nov","day":8,"temp":9.7},
    {"month":"Nov","day":9,"temp":11.0},
    {"month":"Nov","day":10,"temp":17.5},
    {"month":"Nov","day":11,"temp":14.3},
    {"month":"Nov","day":12,"temp":10.4},
    {"month":"Nov","day":13,"temp":11.3},
    {"month":"Nov","day":14,"temp":17.4},
    {"month":"Nov","day":15,"temp":13.0},
    {"month":"Nov","day":16,"temp":14.0},
    {"month":"Nov","day":17,"temp":15.9},
    {"month":"Nov","day":18,"temp":18.8},
    {"month":"Nov","day":19,"temp":20.3},
    {"month":"Nov","day":20,"temp":17.4},
    {"month":"Nov","day":21,"temp":14.5},
    {"month":"Nov","day":22,"temp":14.4},
    {"month":"Nov","day":23,"temp":19.1},
    {"month":"Nov","day":24,"temp":17.8},
    {"month":"Nov","day":25,"temp":12.4},
    {"month":"Nov","day":26,"temp":14.5},
    {"month":"Nov","day":27,"temp":13.8},
    {"month":"Nov","day":28,"temp":12.9},
    {"month":"Nov","day":29,"temp":11.0},
    {"month":"Nov","day":30,"temp":8.4},
    {"month":"Dec","day":1,"temp":10.6},
    {"month":"Dec","day":2,"temp":7.4},
    {"month":"Dec","day":3,"temp":15.5},
    {"month":"Dec","day":4,"temp":13.3},
    {"month":"Dec","day":5,"temp":7.9},
    {"month":"Dec","day":6,"temp":15.5},
    {"month":"Dec","day":7,"temp":13.8},
    {"month":"Dec","day":8,"temp":5.3},
    {"month":"Dec","day":9,"temp":16.4},
    {"month":"Dec","day":10,"temp":13.1},
    {"month":"Dec","day":11,"temp":16.7},
    {"month":"Dec","day":12,"temp":6.7},
    {"month":"Dec","day":13,"temp":11.8},
    {"month":"Dec","day":14,"temp":11.4},
    {"month":"Dec","day":15,"temp":10.6},
    {"month":"Dec","day":16,"temp":10.3},
    {"month":"Dec","day":17,"temp":12.9},
    {"month":"Dec","day":18,"temp":5.1},
    {"month":"Dec","day":19,"temp":5.7},
    {"month":"Dec","day":20,"temp":5.1},
    {"month":"Dec","day":21,"temp":7.5},
    {"month":"Dec","day":22,"temp":7.2},
    {"month":"Dec","day":23,"temp":10.0},
    {"month":"Dec","day":24,"temp":9.6},
    {"month":"Dec","day":25,"temp":8.8},
    {"month":"Dec","day":26,"temp":6.6},
    {"month":"Dec","day":27,"temp":7.2},
    {"month":"Dec","day":28,"temp":11.3},
    {"month":"Dec","day":29,"temp":10.6},
    {"month":"Dec","day":30,"temp":8.5},
    {"month":"Dec","day":31,"temp":7.2}
  ]}, "title": "Daily high temperature (°C)", "mark": "rect", "encoding": {"x": {"field": "day", "type": "ordinal", "title": "Day", "axis": {"labelOverlap": true}}, "y": {"field": "month", "type": "ordinal", "sort": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], "title": null}, "color": {"field": "temp", "type": "quantitative", "title": "°C"}}, "config": {"view": {"discreteHeight": {"step": 22}}}}
```

A scatter plot using color and shape, with generated penguin measurements:

```vega-lite
{"data": {"values": [
    {"species":"Adelie","flipper":201,"mass":3780.0},
    {"species":"Adelie","flipper":195,"mass":4290.0},
    {"species":"Adelie","flipper":188,"mass":3980.0},
    {"species":"Adelie","flipper":182,"mass":3880.0},
    {"species":"Adelie","flipper":191,"mass":3100.0},
    {"species":"Adelie","flipper":195,"mass":3480.0},
    {"species":"Adelie","flipper":199,"mass":3690.0},
    {"species":"Adelie","flipper":189,"mass":3780.0},
    {"species":"Adelie","flipper":188,"mass":3740.0},
    {"species":"Adelie","flipper":186,"mass":3860.0},
    {"species":"Adelie","flipper":190,"mass":3790.0},
    {"species":"Adelie","flipper":171,"mass":3610.0},
    {"species":"Adelie","flipper":190,"mass":2990.0},
    {"species":"Adelie","flipper":191,"mass":3910.0},
    {"species":"Adelie","flipper":197,"mass":3480.0},
    {"species":"Adelie","flipper":201,"mass":3950.0},
    {"species":"Adelie","flipper":207,"mass":4130.0},
    {"species":"Adelie","flipper":195,"mass":3690.0},
    {"species":"Adelie","flipper":182,"mass":3910.0},
    {"species":"Adelie","flipper":196,"mass":4500.0},
    {"species":"Adelie","flipper":196,"mass":3640.0},
    {"species":"Adelie","flipper":178,"mass":3100.0},
    {"species":"Adelie","flipper":185,"mass":3240.0},
    {"species":"Adelie","flipper":194,"mass":3950.0},
    {"species":"Adelie","flipper":188,"mass":3710.0},
    {"species":"Adelie","flipper":189,"mass":3760.0},
    {"species":"Adelie","flipper":195,"mass":4240.0},
    {"species":"Adelie","flipper":185,"mass":2960.0},
    {"species":"Adelie","flipper":200,"mass":4040.0},
    {"species":"Adelie","flipper":198,"mass":3260.0},
    {"species":"Adelie","flipper":188,"mass":3640.0},
    {"species":"Adelie","flipper":180,"mass":3200.0},
    {"species":"Adelie","flipper":195,"mass":4280.0},
    {"species":"Adelie","flipper":201,"mass":3680.0},
    {"species":"Adelie","flipper":180,"mass":3630.0},
    {"species":"Adelie","flipper":197,"mass":3970.0},
    {"species":"Adelie","flipper":181,"mass":3750.0},
    {"species":"Adelie","flipper":196,"mass":4080.0},
    {"species":"Adelie","flipper":187,"mass":3720.0},
    {"species":"Adelie","flipper":196,"mass":3640.0},
    {"species":"Adelie","flipper":177,"mass":3460.0},
    {"species":"Adelie","flipper":193,"mass":3800.0},
    {"species":"Adelie","flipper":196,"mass":3640.0},
    {"species":"Adelie","flipper":189,"mass":3560.0},
    {"species":"Adelie","flipper":194,"mass":4460.0},
    {"species":"Adelie","flipper":188,"mass":4470.0},
    {"species":"Adelie","flipper":201,"mass":4330.0},
    {"species":"Adelie","flipper":194,"mass":4530.0},
    {"species":"Adelie","flipper":189,"mass":3620.0},
    {"species":"Adelie","flipper":183,"mass":3670.0},
    {"species":"Adelie","flipper":199,"mass":4190.0},
    {"species":"Adelie","flipper":193,"mass":3710.0},
    {"species":"Adelie","flipper":191,"mass":3160.0},
    {"species":"Adelie","flipper":197,"mass":3750.0},
    {"species":"Adelie","flipper":182,"mass":3170.0},
    {"species":"Chinstrap","flipper":190,"mass":3830.0},
    {"species":"Chinstrap","flipper":203,"mass":3520.0},
    {"species":"Chinstrap","flipper":202,"mass":4210.0},
    {"species":"Chinstrap","flipper":192,"mass":3140.0},
    {"species":"Chinstrap","flipper":191,"mass":3370.0},
    {"species":"Chinstrap","flipper":198,"mass":3690.0},
    {"species":"Chinstrap","flipper":182,"mass":3380.0},
    {"species":"Chinstrap","flipper":185,"mass":3700.0},
    {"species":"Chinstrap","flipper":188,"mass":3260.0},
    {"species":"Chinstrap","flipper":190,"mass":3380.0},
    {"species":"Chinstrap","flipper":205,"mass":4270.0},
    {"species":"Chinstrap","flipper":200,"mass":3960.0},
    {"species":"Chinstrap","flipper":185,"mass":3240.0},
    {"species":"Chinstrap","flipper":192,"mass":3300.0},
    {"species":"Chinstrap","flipper":200,"mass":3600.0},
    {"species":"Chinstrap","flipper":191,"mass":3250.0},
    {"species":"Chinstrap","flipper":182,"mass":3490.0},
    {"species":"Chinstrap","flipper":205,"mass":4060.0},
    {"species":"Chinstrap","flipper":189,"mass":2670.0},
    {"species":"Chinstrap","flipper":197,"mass":4150.0},
    {"species":"Chinstrap","flipper":198,"mass":4090.0},
    {"species":"Chinstrap","flipper":206,"mass":4400.0},
    {"species":"Chinstrap","flipper":193,"mass":3970.0},
    {"species":"Chinstrap","flipper":201,"mass":3400.0},
    {"species":"Chinstrap","flipper":193,"mass":3190.0},
    {"species":"Chinstrap","flipper":195,"mass":3890.0},
    {"species":"Chinstrap","flipper":189,"mass":2850.0},
    {"species":"Chinstrap","flipper":205,"mass":4120.0},
    {"species":"Chinstrap","flipper":206,"mass":3620.0},
    {"species":"Chinstrap","flipper":203,"mass":4610.0},
    {"species":"Chinstrap","flipper":210,"mass":4080.0},
    {"species":"Chinstrap","flipper":198,"mass":3740.0},
    {"species":"Chinstrap","flipper":203,"mass":4270.0},
    {"species":"Chinstrap","flipper":197,"mass":3320.0},
    {"species":"Chinstrap","flipper":201,"mass":3740.0},
    {"species":"Gentoo","flipper":221,"mass":5390.0},
    {"species":"Gentoo","flipper":227,"mass":6050.0},
    {"species":"Gentoo","flipper":214,"mass":5050.0},
    {"species":"Gentoo","flipper":228,"mass":5510.0},
    {"species":"Gentoo","flipper":220,"mass":5660.0},
    {"species":"Gentoo","flipper":225,"mass":5710.0},
    {"species":"Gentoo","flipper":209,"mass":4170.0},
    {"species":"Gentoo","flipper":218,"mass":5300.0},
    {"species":"Gentoo","flipper":232,"mass":5660.0},
    {"species":"Gentoo","flipper":224,"mass":5750.0},
    {"species":"Gentoo","flipper":207,"mass":4200.0},
    {"species":"Gentoo","flipper":218,"mass":4960.0},
    {"species":"Gentoo","flipper":216,"mass":5190.0},
    {"species":"Gentoo","flipper":212,"mass":4960.0},
    {"species":"Gentoo","flipper":213,"mass":4660.0},
    {"species":"Gentoo","flipper":220,"mass":5060.0},
    {"species":"Gentoo","flipper":219,"mass":5750.0},
    {"species":"Gentoo","flipper":217,"mass":5040.0},
    {"species":"Gentoo","flipper":221,"mass":5210.0},
    {"species":"Gentoo","flipper":223,"mass":5000.0},
    {"species":"Gentoo","flipper":221,"mass":5110.0},
    {"species":"Gentoo","flipper":212,"mass":5430.0},
    {"species":"Gentoo","flipper":212,"mass":5410.0},
    {"species":"Gentoo","flipper":221,"mass":5830.0},
    {"species":"Gentoo","flipper":211,"mass":5170.0},
    {"species":"Gentoo","flipper":226,"mass":5550.0},
    {"species":"Gentoo","flipper":216,"mass":5910.0},
    {"species":"Gentoo","flipper":218,"mass":4990.0},
    {"species":"Gentoo","flipper":213,"mass":5020.0},
    {"species":"Gentoo","flipper":219,"mass":5260.0},
    {"species":"Gentoo","flipper":227,"mass":5570.0},
    {"species":"Gentoo","flipper":220,"mass":5770.0},
    {"species":"Gentoo","flipper":211,"mass":5100.0},
    {"species":"Gentoo","flipper":228,"mass":5240.0},
    {"species":"Gentoo","flipper":210,"mass":4330.0},
    {"species":"Gentoo","flipper":206,"mass":4600.0},
    {"species":"Gentoo","flipper":206,"mass":4610.0},
    {"species":"Gentoo","flipper":226,"mass":5010.0},
    {"species":"Gentoo","flipper":215,"mass":4280.0},
    {"species":"Gentoo","flipper":222,"mass":5090.0},
    {"species":"Gentoo","flipper":215,"mass":5010.0},
    {"species":"Gentoo","flipper":220,"mass":5150.0},
    {"species":"Gentoo","flipper":217,"mass":4890.0},
    {"species":"Gentoo","flipper":218,"mass":4700.0},
    {"species":"Gentoo","flipper":217,"mass":4410.0},
    {"species":"Gentoo","flipper":214,"mass":5590.0},
    {"species":"Gentoo","flipper":217,"mass":4660.0},
    {"species":"Gentoo","flipper":219,"mass":4820.0},
    {"species":"Gentoo","flipper":207,"mass":4240.0},
    {"species":"Gentoo","flipper":221,"mass":5470.0},
    {"species":"Gentoo","flipper":216,"mass":4720.0},
    {"species":"Gentoo","flipper":211,"mass":5180.0},
    {"species":"Gentoo","flipper":218,"mass":4830.0},
    {"species":"Gentoo","flipper":204,"mass":3850.0},
    {"species":"Gentoo","flipper":232,"mass":5540.0},
    {"species":"Gentoo","flipper":217,"mass":5130.0},
    {"species":"Gentoo","flipper":216,"mass":4930.0},
    {"species":"Gentoo","flipper":209,"mass":4220.0},
    {"species":"Gentoo","flipper":227,"mass":5400.0},
    {"species":"Gentoo","flipper":222,"mass":4770.0}
  ]}, "mark": {"type": "point", "filled": false}, "encoding": {"x": {"field": "flipper", "type": "quantitative", "title": "Flipper length (mm)", "scale": {"zero": false}}, "y": {"field": "mass", "type": "quantitative", "title": "Body mass (g)", "scale": {"zero": false}}, "color": {"field": "species", "title": "Species"}, "shape": {"field": "species", "title": "Species"}}}
```

A stacked bar chart with rounded ends:

```vega-lite
{"data": {"values": [
    {"month":"Jan","weather":"sun","days":25},
    {"month":"Feb","weather":"sun","days":29},
    {"month":"Mar","weather":"sun","days":36},
    {"month":"Apr","weather":"sun","days":53},
    {"month":"May","weather":"sun","days":77},
    {"month":"Jun","weather":"sun","days":76},
    {"month":"Jul","weather":"sun","days":90},
    {"month":"Aug","weather":"sun","days":86},
    {"month":"Sep","weather":"sun","days":64},
    {"month":"Oct","weather":"sun","days":37},
    {"month":"Nov","weather":"sun","days":33},
    {"month":"Dec","weather":"sun","days":34},
    {"month":"Jan","weather":"rain","days":65},
    {"month":"Feb","weather":"rain","days":77},
    {"month":"Mar","weather":"rain","days":79},
    {"month":"Apr","weather":"rain","days":62},
    {"month":"May","weather":"rain","days":41},
    {"month":"Jun","weather":"rain","days":42},
    {"month":"Jul","weather":"rain","days":15},
    {"month":"Aug","weather":"rain","days":25},
    {"month":"Sep","weather":"rain","days":36},
    {"month":"Oct","weather":"rain","days":64},
    {"month":"Nov","weather":"rain","days":75},
    {"month":"Dec","weather":"rain","days":73},
    {"month":"Jan","weather":"fog","days":17},
    {"month":"Feb","weather":"fog","days":3},
    {"month":"Mar","weather":"fog","days":6},
    {"month":"Apr","weather":"fog","days":3},
    {"month":"May","weather":"fog","days":4},
    {"month":"Jun","weather":"fog","days":4},
    {"month":"Jul","weather":"fog","days":10},
    {"month":"Aug","weather":"fog","days":10},
    {"month":"Sep","weather":"fog","days":12},
    {"month":"Oct","weather":"fog","days":19},
    {"month":"Nov","weather":"fog","days":13},
    {"month":"Dec","weather":"fog","days":7},
    {"month":"Jan","weather":"drizzle","days":9},
    {"month":"Feb","weather":"drizzle","days":4},
    {"month":"Mar","weather":"drizzle","days":2},
    {"month":"Apr","weather":"drizzle","days":3},
    {"month":"May","weather":"drizzle","days":1},
    {"month":"Jun","weather":"drizzle","days":3},
    {"month":"Jul","weather":"drizzle","days":9},
    {"month":"Aug","weather":"drizzle","days":7},
    {"month":"Sep","weather":"drizzle","days":3},
    {"month":"Oct","weather":"drizzle","days":4},
    {"month":"Nov","weather":"drizzle","days":3},
    {"month":"Dec","weather":"drizzle","days":3},
    {"month":"Jan","weather":"snow","days":8},
    {"month":"Feb","weather":"snow","days":4},
    {"month":"Mar","weather":"snow","days":6},
    {"month":"Apr","weather":"snow","days":1},
    {"month":"May","weather":"snow","days":0},
    {"month":"Jun","weather":"snow","days":0},
    {"month":"Jul","weather":"snow","days":0},
    {"month":"Aug","weather":"snow","days":0},
    {"month":"Sep","weather":"snow","days":0},
    {"month":"Oct","weather":"snow","days":0},
    {"month":"Nov","weather":"snow","days":1},
    {"month":"Dec","weather":"snow","days":6}
  ]}, "mark": {"type": "bar", "cornerRadiusEnd": 4}, "encoding": {"x": {"field": "month", "type": "ordinal", "sort": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], "title": null}, "y": {"field": "days", "type": "quantitative", "title": "Days"}, "color": {"field": "weather", "title": "Weather"}}}
```

A chart that asks for external data shows an error and sends no request:

```vega-lite
{
  "data": { "url": "https://example.com/data.csv" },
  "mark": "line",
  "encoding": { "x": { "field": "day" } }
}
```

Invalid JSON shows an error:

```vega-lite
{ not json
```

A `vega` fence stays a code block:

```vega
{ "marks": [] }
```
