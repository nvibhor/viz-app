function Exception(message) {
   this.message = message;
}

function keySorterFn(keyA, keyB) {
  var a = parseInt(keyA.substr(1));
  var b = parseInt(keyB.substr(1));
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

var worldVisualizer = null;

/**
 * @constructor
 * @this {WorldVisualizer}
 * @param {Object} data JS object equivalent of json world population data sent
 *    by app.
 */
function WorldVisualizer(data) {
  /**
   * @private
   */
  this.dataTable_ = new google.visualization.DataTable();

  /**
   * Maintains an inverse table of above i.e. year x country.
   * @private
   */
  this.inverseDataTable_ = new google.visualization.DataTable();
  this.inverseDataTable_.addColumn('number', 'Year');

  /**
   * Maintains a map from country name to country code.
   * @private
   */
  this.countryCodes_ = {};

  this.initializeDataTable_(data);
}

/**
 * Initialized the data table objects with rows/columns for year group values.
 *    data.columnNames field is mutated in this method.
 *
 * @param {Object} data See above.
 *
 * @return {Array.<string>} sorted list of keys for years
 *
 * @private
 */
WorldVisualizer.prototype.initializeYearDimension_ = function(data) {
  var dataTable = this.dataTable_;
  var inverseDataTable = this.inverseDataTable_;

  var columnNames = data.columnNames;

  // Country column
  dataTable.addColumn("string", columnNames.k0, 'k0');
  delete columnNames.k0;
  // skip Country code column
  this.countryCodes_[columnNames.k0] = columnNames.k1;
  delete columnNames.k1;
  
  // Add remaining columns for years
  keys = Object.keys(columnNames).sort(keySorterFn);
  keys.forEach(function(key) {
    var year = columnNames[key];
    dataTable.addColumn('number', year, key);
    inverseDataTable.addRow([parseInt(year)]);
  });

  return keys;
};


/**
 * Processes one row of country data that should contain all the population
 *    numbers for a single country.  @param {Object} countryRow
 *
 * @param {Array.<string>} yearKeys A list like ['k2', 'k3' ...] which are
 *    placeholder keys for corresponding years ['1961', '1962' ...] present in
 *    data.columnNames.
 * @param {number} numCountries Number of countries processed before this call.
 *
 * @return {number} Total number of countries processed so far. It should
 *    always be numCountries + 1.
 *
 * @private
 */
WorldVisualizer.prototype.processCountryRow_ = function(countryRow, yearKeys, numCountries) {
  var dataTable = this.dataTable_;
  var inverseDataTable = this.inverseDataTable_;

  var countryName = countryRow['k0'];
  // Create per country column (for line chart)
  inverseDataTable.addColumn('number', countryName);

  var dataRow = [];
  dataRow.push(countryName);
  var numYears = 0;
  yearKeys.forEach(function(yearKey) {
    var value = {};
    if (!countryRow[yearKey] || countryRow[yearKey] == 0) {
      value.v = 0;
      value.f = 'n/a';
    } else {
      value.v = countryRow[yearKey];
    }
    dataRow.push(value);
    inverseDataTable.setCell(numYears++, numCountries + 1, value.v, value.f);
  });
  dataTable.addRow(dataRow);

  return numCountries + 1;
};


/**
 * Initialized the data tables from the world population json data sent from
 *    the app.
 * @param {Object} data See above.
 *
 * @private
 */
WorldVisualizer.prototype.initializeDataTable_ = function(data) {
  if (!data.columnNames || !data.dataRows || data.dataRows.length <= 0) {
   throw new Exception(
       "Invalid data: no column names and data rows found");
  }

  var columnNames = data.columnNames;
  if (!columnNames.k0 || !columnNames.k1) {
    throw new Exception(
        "Invalid data: Country Name and Country code must be present");
  }

  var dataTable = this.dataTable_;
  var inverseDataTable = this.inverseDataTable_;

  keys = this.initializeYearDimension_(data);

  var dataRows = data.dataRows;
  var numCountries = 0;
  var me = this;
  dataRows.forEach(function(dataRowAsDictionary) {
    numCountries = me.processCountryRow_(dataRowAsDictionary, keys, numCountries);
  });
};


// TODO: remove this before submitting.
WorldVisualizer.prototype.logDataToConsole = function() {
  if (console && console.log) {
    console.log(this.dataTable_);
    console.log(this.inverseDataTable_);
  }
};


/**
 * Render this.dataTable_ using google.visualization.Table. 
 * @param {Element} container The DOM Element used as container to render the
 *    world data table.
 */
WorldVisualizer.prototype.displayAsTable = function(container) {
  var table = new google.visualization.Table(container);
  table.draw(this.dataTable_);
};


/**
 * Render this.inverseDataTable_ using google.visualization.LineChart.
 * @param {Element} container The DOM Element used as container to render the
 *    world population data in a year chart.
 */
WorldVisualizer.prototype.displayAsLineChart = function(container) {
  $(container).empty();
  var chart = new google.visualization.LineChart(container);
  var options = {
    chartArea: {width: '80%', height: '90%'},
  };
  chart.draw(this.inverseDataTable_, options);
};


/**
 * Namespace
 */
function UIUtils() { }

/**
 * @param {Event} event
 * @param {JQuery} ui
 */
UIUtils.onTabActivate = function(event, ui) {
  // No-op when no world data available.
  if (!worldVisualizer) return;

  // No-op for any tab other tab 2.
  if (!ui.newPanel.is('#tabs-2')) return;
  
  var chartDiv = $('#chart-area');
  // If the chart has already been plotted once, no-op.
  if (chartDiv.children() > 0) return;

  worldVisualizer.displayAsLineChart(chartDiv[0]);
};
