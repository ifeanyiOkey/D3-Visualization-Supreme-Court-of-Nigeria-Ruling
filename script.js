const {
  select,
  csv,
  sum,
  group,
  stack,
  max,
  scaleBand,
  axisBottom,
  axisLeft,
  scaleLinear,
  scaleOrdinal,
  format,
} = d3;

const section = select("body").append("section");
const heading = section.append("heading");

heading
  .append("h1")
  .attr("id", "title")
  .text("Rulings of Appeal Cases Heard at The Supreme Court of Nigeria, 1962 - 2022")
  .style("text-align", "center");

const sub = heading
  .append("p")
  .attr("id", "sub-heading")
  .style("text-align", "center");
sub
  .text("Data Source:")
  .append("a")
  .attr("href", "https://data.mendeley.com/datasets/ky6zfyf669/1")
  .attr("target", "_blank")
  .append("text")
  .attr("class", "source-author")
  .text(" Mendeley");

const w = 960;
const h = 500;
const margin = {
    top: 0,
    right: 100,
    bottom: 80,
    left: 100,
  },
  padding = { left: 20, right: 10 };

const svg = section
  .append("svg")
  .attr("height", h + margin.top + margin.bottom)
  .attr("width", w + margin.left + margin.right)
  .style("background", "none");

const g = svg
  .append("g")
  .attr("transform", "translate(" + 70 + "," + margin.top + ")");

csv(
  "https://gist.githubusercontent.com/ifeanyiOkey/ad1186297bb2d1856c8053220ea63c5f/raw/scn_appeal_cases_data.csv"
)
  .then((dataset) => {
    //*** PREPARING DATA ***

    // Map scn_decision to offence -- Array
    const scnDecision = dataset.map((d) => [
      d.offence,
      d.scn_decision,
      d.sentence,
    ]);

    // group the data by offencies
    const dataGroup = group(scnDecision, (d) => d[0]);

    // get Granted and Dismissed scnDecisions
    const filteredData = Array.from(dataGroup, ([key, value]) => [
      key,
      value.map((d) => d[1].includes("Granted")),
      value.map((d) => d[1].includes("Dismissed")),
    ]);

    // map number of Dismissed and Granted scnDecisions to Offences
    const dataNum = filteredData.map((d) => {
      return {
        offence: d[0],
        granted: d[1].filter((d) => d === true).length,
        dismissed: d[2].filter((d) => d === true).length,
      };
    });

    // get dismissed and granted keys for stacking
    const keys = Object.keys(dataNum[0]).slice(1);

    // get unique offences
    const offences = dataNum.map((d) => d.offence);

    // create stack, passing in the keys
    const stackedData = stack().keys(keys)(dataNum);

    console.log(stackedData);
    console.log(keys);

    // Scales

    const xScale = scaleBand()
      .domain(offences) // distinct offences
      .range([0, w - 100])
      .padding(0.2);

    const xAxis = axisBottom().scale(xScale).tickSize(7, 1);

    const yScale = scaleLinear()
      .domain([0, max(dataNum.map((d) => d.granted + d.dismissed))]) // No. of cases
      .range([h - margin.right, 0]);

    const yAxis = axisLeft().scale(yScale).tickSize(10, 1);

    const color = scaleOrdinal().domain(keys).range(["#24245a", "#b61c25"]);
    // Axis labels

    g.append("g")
      .attr("id", "x-axis")
      .attr("transform", "translate(" + padding.right + "," + (h - margin.bottom) + ")")
      .call(xAxis)
      .selectAll("text")
      .attr("transform", "translate(-10,2)rotate(-45)")
      .style("text-anchor", "end");

    g.append("g")
      .attr("id", "y-axis")
      .attr(
        "transform",
        "translate(" + padding.right + "," + margin.top + padding.left + ")"
      )
      .call(yAxis)
      .append("text")
      .text("No. of Cases")
      .attr(
        "transform",
        "translate(" + 60 / -1 + "," + h / 2 + ")" + "rotate(-90)"
      )
      .attr("fill", "black")
      .style("text-anchor", "middle")
      .style("font-size", "14");

    // Tooltip

    const tooltip = select("body")
      .append("div")
      .attr("id", "tooltip")
      .style("opacity", 0);

    // plot

    g.append("g")
      .selectAll()
      .data(stackedData)
      .join("g")
      .attr("fill", (d) => color(d.key))
      .selectAll()
      .data((d) => d)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => xScale(d.data.offence) + padding.right) // + padding
      .attr("y", (d, i) => yScale(d[1]) + padding.left) // + padding
      .attr("width", xScale.bandwidth())
      .attr("height", (d, i) => yScale(d[0]) - yScale(d[1])) //  - (margin.bottom + padding)
      .on("mouseover", (e, d, i) => {
        tooltip.transition().duration(50).style("opacity", 0.9);
        tooltip
          .html(
            "Case: " +
              "<span>" +
              d.data.offence +
              "</span>" +
              "<br>" +
              "No. of Cases: " +
              "<span>" +
              (d[1] - d[0]) +
              "</span>"
          )
          .style("left", e.pageX - 50 + "px")
          .style("top", e.pageY - 120 + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(50).style("opacity", 0);
      });

    // Legend

    // Sorting out data for Legend construction

    // map out granted and dismissed data only
    const legendData = dataNum.map((d) => {
      return {
        granted: d.granted,
        dismissed: d.dismissed,
      };
    });

    const legendDataSum = [
      {
        granted: sum(legendData, (d) => d.granted),
        dismissed: sum(legendData, (d) => d.dismissed),
      },
    ];

    const legendStack = stack().keys(Object.keys(legendDataSum[0]))(
      legendDataSum
    );

    console.log(legendDataSum);

    const legend_pad = 50;
    const legendDataMax = max(
      legendDataSum.map((d) => d.granted + d.dismissed)
    );
    const legendSum_Granted = legendDataSum.map((d) => d.granted);
    const legendSum_Dismissed = legendDataSum.map((d) => d.dismissed);
    const f = format(".0%");
    const legendScale = scaleLinear()
      .domain([0, legendDataMax]) // 100%
      .range([h - margin.right, legend_pad]);

    const legendAxis = d3
      .axisRight()
      .scale(legendScale)
      .tickSize(10)
      .tickValues([
        0,
        legendSum_Granted / 2,
        legendSum_Granted,
        legendDataMax - legendSum_Granted,
        legendDataMax,
      ])
      .tickFormat(
        (d, i) =>
          [
            0,
            "Granted Cases: " + f(legendSum_Granted / legendDataMax),
            legendSum_Granted,
            "Dismissed Cases: " + f(legendSum_Dismissed / legendDataMax),
            legendDataMax,
          ][i]
      );

    const legend = svg
      .append("g")
      .attr("transform", "translate(" + (w + padding.left + padding.right) + "," + margin.top + ")");

    legend
      .append("g")
      .attr("id", "legend-axis")
      .attr(
        "transform",
        "translate(" + padding.left + "," + margin.top + padding.left + ")"
      )
      .call(legendAxis)
      .select(".domain")
      .attr("stroke-width", 0);

    legend
      .append("g")
      .selectAll()
      .data(legendStack)
      .join("g")
      .attr("fill", (d) => color(d.key))
      .selectAll()
      .data((d) => d)
      .join("rect")
      .attr("class", "legendBar")
      .attr("y", (d, i) => legendScale(d[1]) + padding.left) // + padding.left
      .attr("x", 0) // + padding
      .attr("width", padding.left)
      .attr("height", (d, i) => legendScale(d[0]) - legendScale(d[1]));

    // Author

    const author = svg
      .append("g")
      .attr(
        "transform",
        "translate(" +
          (1000 + padding.left) +
          "," +
          (h + padding.left + padding.right * 2) +
          ")"
      );

    author
      .append("a")
      .attr("href", "https://codepen.io/ifeanyiOkey/")
      .attr("target", "_blank")
      .append("text")
      .attr("class", "author")
      .text("Visualized by Ifeanyi");
  })
  .catch((err) => console.log(err));
