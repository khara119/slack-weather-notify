/**
 * 天気予報を通知する
 *
 * @param Number numberOfHour 取得する時間数（10-18時なら9）  
 */
function notify(numberOfHour) {
  // 環境設定データの初期化
  initConfigData();
  
  numberOfHour = numberOfHour ? numberOfHour : 12;
  
  weather_info = getWeather();
  weather_hourly = weather_info.hourly;
  
  var maxPrecipProbability = 0;
  var maxPrecipProbabilityTime = [];
  for (var i=0; i<numberOfHour; i++) {
    var data = weather_hourly.data[i];
    var time = Moment.moment.unix(data.time).format('YYYY-MM-DD HH:mm');
    var precipProbability = Math.round(data.precipProbability * 10) * 10;
    Logger.log(time + ': ' + JSON.stringify(data));
    
    if (precipProbability > maxPrecipProbability) {
      maxPrecipProbability = precipProbability;
      maxPrecipProbabilityTime = [];
      maxPrecipProbabilityTime.push(time.slice(-5, -3) + '時');
    } else if (precipProbability == maxPrecipProbability) {
      maxPrecipProbabilityTime.push(time.slice(-5, -3) + '時');
    }
  }
  
  const start_time = Moment.moment.unix(weather_hourly.data[0].time).format('MM月DD日 HH時');
  const end_time = Moment.moment.unix(weather_hourly.data[numberOfHour-1].time).format('MM月DD日 HH時');
  var text = start_time + 'から' + end_time +'までの最高降水確率は ' + maxPrecipProbability + '% です。\n';
  if (maxPrecipProbabilityTime.length > 0) {
    text += JSON.stringify(maxPrecipProbabilityTime) + 'に最高降水確率になります。';
  }
  
  Logger.log(text);

  // Slackに投稿する
  var payload = {
    "text": text,
    "channel": this.config.channel,
    "username": this.config.username,
    "icon_url": this.config.icon_url,
  };
  
  postSlack(payload);
}

/**
 * 天気予報を取得
 *
 * @param Number time 取得する時間
 */
function getWeather() {
  // APIを取得するサービス名を取得
  var service = this.config.service_name;

  // APIを取得するURLを取得
  var url = this.config[service+'_base_url'] + this.config[service+'_secret_key'] +
    '/' + this.config.latitude + ',' + this.config.longitude +'?exclude=minutely,flags&units=si';
  
  var response = UrlFetchApp.fetch(url);
  return JSON.parse(response.getContentText());
}

/**
 * 朝に当日の天気予報を通知する
 */
function notifyWeatherAtMoning() {
  notify(19);
}

/**
 * 夜に翌朝までの天気予報を通知する
 */
function notifyWeatherAtNight() {
  notify(11);
}

/**
 * 毎朝投稿する時間をセットする
 * （GASのトリガーは分単位で指定できないため、この関数で詳細時間をセットする）
 */
function setMoningTrigger() {
  // configデータを設定する
  initConfigData();
  
  // 発火時間を設定する
  var triggerDate = new Date();
  triggerDate.setHours(this.config.moning_trigger_hour);
  triggerDate.setMinutes(this.config.moning_trigger_minute);
  
  // 時間指定してトリガーをセットする
  ScriptApp.newTrigger("notifyWeatherAtMoning").timeBased().at(triggerDate).create();
}

/**
 * 毎晩投稿する時間をセットする
 * （GASのトリガーは分単位で指定できないため、この関数で詳細時間をセットする）
 */
function setNightTrigger() {
  // configデータを設定する
  initConfigData();
  
  // 発火時間を設定する
  var triggerDate = new Date();
  triggerDate.setHours(this.config.night_trigger_hour);
  triggerDate.setMinutes(this.config.night_trigger_minute);
  
  // 時間指定してトリガーをセットする
  ScriptApp.newTrigger("notifyWeatherAtNight").timeBased().at(triggerDate).create();
}

/**
 * Slackに投稿する
 */
function postSlack(payload) {
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  };
  
  Logger.log(options);
  
  UrlFetchApp.fetch(this.config.post_slack_url, options);
}

/**
 * SpreadSheetに記載している環境設定を取得
 */
function initConfigData() {
  this.config = {};
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("config");
  
  var last_row = sheet.getLastRow();
  for (var i=1; i<=last_row; i++) {
    key = sheet.getRange(i, 1).getValue();
    value = sheet.getRange(i, 2).getValue();
    
    this.config[key] = value;
  }
}