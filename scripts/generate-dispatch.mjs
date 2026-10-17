/**
 * Engineering Deep Dive: Topic Queue & Veto Automation
 * Sheet ID: 1p2_66RgIBWeA6G2V4vZhS-868XR7iraM7qK0Gl13y1g
 */

const QUEUE_SHEET = "Weekly Queue";
const BACKLOG_SHEET = "Backlog";
const VETO_LOG_SHEET = "Veto Log";

/**
 * Real-time trigger: Swaps vetoed topics instantly when checkbox in Column A is checked.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== QUEUE_SHEET) return;

  const row = e.range.getRow();
  const col = e.range.getColumn();

  // Column 1 is the Veto Checkbox (Row >= 2)
  if (col === 1 && row >= 2 && e.value === "TRUE") {
    handleTopicVeto(sheet, row);
  }
}

/**
 * Swaps the vetoed topic with the first available topic in the Backlog.
 */
function handleTopicVeto(queueSheet, row) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const backlogSheet = ss.getSheetByName(BACKLOG_SHEET);
  
  // Extract vetoed topic data: [Veto, Date, Discipline, Topic, Summary, Status, Backlog_ID]
  const rowData = queueSheet.getRange(row, 1, 1, 7).getValues()[0];
  const oldDate = rowData[1];
  const oldDiscipline = rowData[2];
  const oldTopic = rowData[3];
  const oldSummary = rowData[4];
  const oldId = rowData[6];

  // Search Backlog for the first Available topic
  const backlogData = backlogSheet.getDataRange().getValues();
  let replacementRow = -1;
  let newTopicData = null;

  for (let i = 1; i < backlogData.length; i++) {
    const status = backlogData[i][4]; // Column E: Used In Queue
    if (status === "Available") {
      replacementRow = i + 1;
      newTopicData = {
        id: backlogData[i][0],
        discipline: backlogData[i][1],
        topic: backlogData[i][2],
        summary: backlogData[i][3]
      };
      break;
    }
  }

  if (!newTopicData) {
    queueSheet.getRange(row, 6).setValue("Vetoed - No Backlog Remaining");
    queueSheet.getRange(row, 1).setValue(false);
    SpreadsheetApp.getUi().alert("Backlog exhausted! Please replenish your 100-topic pool.");
    return;
  }

  // 1. Update Backlog: Mark old topic Vetoed, mark replacement In Weekly Lineup
  for (let i = 1; i < backlogData.length; i++) {
    if (backlogData[i][0] === oldId) {
      backlogSheet.getRange(i + 1, 5).setValue("Vetoed");
      break;
    }
  }
  backlogSheet.getRange(replacementRow, 5).setValue("In Weekly Lineup");

  // 2. Log veto for GitHub Actions negative prompt tuning
  logVeto(ss, oldId, oldDiscipline, oldTopic, oldSummary);

  // 3. Swap topic into the Weekly Queue
  queueSheet.getRange(row, 1).setValue(false); // Reset checkbox
  queueSheet.getRange(row, 3).setValue(newTopicData.discipline);
  queueSheet.getRange(row, 4).setValue(newTopicData.topic);
  queueSheet.getRange(row, 5).setValue(newTopicData.summary);
  queueSheet.getRange(row, 6).setValue("Active");
  queueSheet.getRange(row, 7).setValue(newTopicData.id);

  SpreadsheetApp.getActive().toast(`Replaced "${oldTopic}" with "${newTopicData.topic}" (${newTopicData.id})`, "Topic Vetoed", 4);
}

/**
 * Appends vetoed topics to a persistent Veto Log sheet.
 */
function logVeto(ss, id, discipline, topic, summary) {
  let logSheet = ss.getSheetByName(VETO_LOG_SHEET);
  if (!logSheet) {
    logSheet = ss.insertSheet(VETO_LOG_SHEET);
    logSheet.appendRow(["Timestamp", "Backlog_ID", "Discipline", "Topic", "Summary"]);
    logSheet.getRange("A1:E1").setFontWeight("bold");
  }
  logSheet.appendRow([new Date(), id, discipline, topic, summary]);
}

/**
 * Populates the Weekly Queue for the next 7 days starting from a given date.
 */
function stageNextWeek(startDateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const queueSheet = ss.getSheetByName(QUEUE_SHEET);
  const backlogSheet = ss.getSheetByName(BACKLOG_SHEET);
  const backlogData = backlogSheet.getDataRange().getValues();

  let startDate = startDateStr ? new Date(startDateStr) : new Date();
  let availableIndices = [];

  for (let i = 1; i < backlogData.length; i++) {
    if (backlogData[i][4] === "Available") {
      availableIndices.push(i);
      if (availableIndices.length === 7) break;
    }
  }

  if (availableIndices.length < 7) {
    SpreadsheetApp.getUi().alert("Not enough available backlog items to stage 7 days.");
    return;
  }

  // Clear current active queue rows (rows 2 to 8)
  for (let d = 0; d < 7; d++) {
    const curDate = new Date(startDate);
    curDate.setDate(startDate.getDate() + d);
    const dateFormatted = Utilities.formatDate(curDate, Session.getScriptTimeZone(), "yyyy-MM-dd");

    const bIndex = availableIndices[d];
    const bRow = bIndex + 1;
    const bId = backlogData[bIndex][0];
    const bDiscipline = backlogData[bIndex][1];
    const bTopic = backlogData[bIndex][2];
    const bSummary = backlogData[bIndex][3];

    // Mark as In Weekly Lineup in Backlog
    backlogSheet.getRange(bRow, 5).setValue("In Weekly Lineup");

    // Write to Weekly Queue
    queueSheet.getRange(d + 2, 1, 1, 7).setValues([[
      false,
      dateFormatted,
      bDiscipline,
      bTopic,
      bSummary,
      "Active",
      bId
    ]]);
  }
}

/**
 * Web App endpoint: Exposes active queue and vetoes as JSON for GitHub Actions.
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const queueSheet = ss.getSheetByName(QUEUE_SHEET);
  const queueData = queueSheet.getDataRange().getValues();
  
  const schedule = [];
  for (let i = 1; i < queueData.length; i++) {
    if (queueData[i][1]) {
      schedule.push({
        date: Utilities.formatDate(new Date(queueData[i][1]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
        discipline: queueData[i][2],
        topic: queueData[i][3],
        summary: queueData[i][4],
        status: queueData[i][5],
        id: queueData[i][6]
      });
    }
  }

  const logSheet = ss.getSheetByName(VETO_LOG_SHEET);
  const vetoes = [];
  if (logSheet) {
    const logData = logSheet.getDataRange().getValues();
    for (let i = 1; i < logData.length; i++) {
      vetoes.push({
        id: logData[i][1],
        discipline: logData[i][2],
        topic: logData[i][3],
        summary: logData[i][4]
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ schedule, vetoes }, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Adds a custom menu to the Google Sheet UI.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Queue Tools")
    .addItem("Stage Next 7 Days", "stageNextWeekMenu")
    .addToUi();
}

function stageNextWeekMenu() {
  stageNextWeek();
}