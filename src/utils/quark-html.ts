import { ThemeColor } from "vscode";

/**
 * Generate WebView HTML for quark report.
 * @param report The data of quark report.
 * @returns WebView HTML
 */
export function quarkSummaryReportHTML(report: { [key: string]: any }): string {
    let allCrimesHTML = "";

    for (const key in report) {
        const crimeObj = report[key];
        allCrimesHTML += `
        <tr class="row100 body" onclick="a(this.id)" id="${key}">
            <td class="cell100 column1">${crimeObj["crime"]}</td>
            <td class="cell100 column2">${crimeObj["confidence"]}</td>
        </tr>`;

        for (const pkey in report[key]["api_call"]) {
            const parentFunc = report[key]["api_call"];
            allCrimesHTML += `
            <tr onclick="navigate(this.id, '${key}')" id="${pkey}" style="display: none;">
                <td class="sub">
                <p>Class : ${parentFunc[pkey]["function"]["class"]}</p>
                <p>Method : ${parentFunc[pkey]["function"]["method"]}</p>

                <div class="api">
                    <p>API 1: <a>${parentFunc[pkey]["apis"][0]}</a></p>
                    <p>API 2: <a>${parentFunc[pkey]["apis"][1]}</a></p>
                </div>

                </td>
            </tr>`;
        }
    }
    const backgroundColor = new ThemeColor("badge.background");
    const style = `

        .vscode-light body{
            background: ${backgroundColor};
            color: #e2e2e2;
        }
        .vscode-dark body{
            background: ${backgroundColor};
            color: #000;
        }

        .js-pscroll {
            position: relative;
            overflow: hidden;
        }

        .table100 .ps__rail-y {
            width: 9px;
            background-color: transparent;
            opacity: 1 !important;
            right: 5px;
        }

        .table100 .ps__rail-y::before {
            content: "";
            display: block;
            position: absolute;
            background-color: #ebebeb;
            border-radius: 5px;
            width: 100%;
            height: calc(100% - 30px);
            left: 0;
            top: 15px;
        }

        .table100 .ps__rail-y .ps__thumb-y {
            width: 100%;
            right: 0;
            background-color: transparent;
            opacity: 1 !important;
        }

        .table100 .ps__rail-y .ps__thumb-y::before {
            content: "";
            display: block;
            position: absolute;
            background-color: #cccccc;
            border-radius: 5px;
            width: 100%;
            height: calc(100% - 30px);
            left: 0;
            top: 15px;
        }

        .container-table100 {
            display: -webkit-box;
            display: -webkit-flex;
            display: -moz-box;
            display: -ms-flexbox;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            padding: 33px 30px;
        }

        .wrap-table100 {
            width: 100%;
        }

        table {
            width: 100%;
        }

        th, td {
            font-weight: unset;
            padding-right: 10px;
        }

        .column1 {
            width: 90%;
            padding-left: 40px;
        }

        .column2 {
            width: 10%;
        }

        .table100-body td {
            padding-top: 16px;
            padding-bottom: 16px;
        }

        .table100 {
            position: relative;
            padding-top: 60px;
        }

        .table100-head {
            position: absolute;
            width: 100%;
            top: 0;
            left: 0;
        }

        .table100-body {
            max-height: 100%;
            overflow: auto;
        }

        .table100.ver5 .table100-head {
            padding-right: 30px;
        }

        .table100.ver5 th {
            text-align: left;
            font-family: Lato-Bold;
            font-size: 16px;
            line-height: 1.4;

            background-color: transparent;
        }

        .vscode-light .table100.ver5 td {
            font-family: Lato-Regular;
            font-size: 15px;
            line-height: 1.4;
            background-color: #d4d4d4;
        }

        .vscode-dark .table100.ver5 td {
            font-family: Lato-Regular;
            font-size: 15px;
            line-height: 1.4;
            background-color: #565656;
        }

        .vscode-light .table100.ver5 td.sub {
            font-family: Lato-Regular;
            font-size: 15px;
            line-height: 1.4;
            padding-left: 40px;
            background-color: #dcfddc;
        }

        .vscode-dark .table100.ver5 td.sub {
            font-family: Lato-Regular;
            font-size: 15px;
            line-height: 1.4;
            padding-left: 40px;
            background-color: #2f5658;
        }

        .table100.ver5 .table100-body tr {
            overflow: hidden;
            border-radius: 10px;
        }

        .table100.ver5 .table100-body table {
            border-collapse: separate;
            border-spacing: 0 10px;
        }

        .table100.ver5 .table100-body td {
            border: solid 1px transparent;
            border-style: solid none;
            padding-top: 10px;
            padding-bottom: 10px;
        }

        .table100.ver5 .table100-body td:first-child {
            border-left-style: solid;
            border-top-left-radius: 10px;
            border-bottom-left-radius: 10px;
        }

        .table100.ver5 .table100-body td:last-child {
            border-right-style: solid;
            border-bottom-right-radius: 10px;
            border-top-right-radius: 10px;
        }

        .vscode-light .table100.ver5 tr:hover td {
            background-color: #6b6b6b;
            cursor: pointer;
        }

        .vscode-dark .table100.ver5 tr:hover td {
            background-color: #000;
            cursor: pointer;
        }

        .vscode-light .table100.ver5 tr:hover td.sub {
            background-color: #90a790;
            cursor: pointer;
        }

        .vscode-dark .table100.ver5 tr:hover td.sub {
            background-color: #193435;
            cursor: pointer;
        }

        .table100.ver5 .table100-head th {
            padding-top: 25px;
            padding-bottom: 25px;
        }

        .api {
            padding-left: 50px;
        }

        .vscode-light .api a{
            color: #d05345;
        }

        .vscode-dark .api a{
            color: #ff9696;
        }

        .treemap-btn {
            margin-top: 15px;
            background: none;
            border: 1px solid rgb(0, 196, 104);
            color: rgb(0, 196, 104);
            padding: 15px 32px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            border-radius: 10px;
            cursor: pointer;
        }

        .treemap-btn:hover {
            background-color: rgb(0, 97, 52);
            border: 1px solid rgb(0, 97, 52);
            color: white;
            border: none;
        }

        .treemap-container {
            font-size: 18px;
            text-align: center;
            align-items: center;
            justify-content: center;
        }
    `;

    const reportHTML = `
<!DOCTYPE html>
    <html lang="en">
    <head>
    <title>CSS Template</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${style}
</style>
</head>
<body>
<div class="container-table100">
<h1>Quark Analysis</h1>
			<div class="wrap-table100">
					<div class="table100 ver5 m-b-110">
					<div class="table100-head">
						<table>
							<thead>
								<tr class="row100 head">
									<th class="column1">Potential Malicious Activities</th>
									<th class="column2">Confidence</th>
								</tr>
							</thead>
						</table>
					</div>

					<div class="table100-body">
						<table>
                            <tbody>
                            ${allCrimesHTML}
                            </tbody>
						</table>
					</div>
				</div>
			</div>
            <div class="treemap-container">
                <hr>
                <p>See the reference treemap graph for rule classification</p>
                <button class="treemap-btn" onclick="treemap()">Reference Tree</button>
            </div>
        </div>

    </body>
    </html>
    <script>
    const vscode = acquireVsCodeApi();
    function apicall(crimeId) {
        vscode.postMessage({
            command: 'apicall',
            crimeId: crimeId
        });
    }

    function navigate(fid, cid) {
        vscode.postMessage({
            command: 'navigate',
            functionId: fid,
            cid: cid
        });
    }

    function treemap() {
        vscode.postMessage({
            command: 'treemap',
        });
    }

    function a(id){
        const matcher = "[id^='" + id + "-']"
        var elements = document.querySelectorAll(matcher);
        var names = '';
        for(var i=0; i<elements.length; i++) {

          if (elements[i].style.display === "none") {
            elements[i].style.display = "block";
          } else {
            elements[i].style.display = "none";
          }
        }
      }
    </script>
`;
    return reportHTML;
}
