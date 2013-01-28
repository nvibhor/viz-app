/**
 * Throwable object with error messages.
 *
 * @param {string} message Error message to be thrown.
 *
 * @private
 */
function Exception(message) {
   this.message = message;
}

/**
 * Log message to console if console log available.
 *
 * @param {string} message Message to be logged.
 *
 * @private
 */
function log(message) {
  if (console && console.log) {
    console.log(message);
  }
}

/**
 * Comparator function using in sorting list of keys 'k0', 'k1' ...
 *
 * @param {string} keyA Of form 'k0'
 * @param {string} keyB Of form 'k1'
 *
 * @return {number} 1 if keyA > keyB, -1 if keyA < keyB, otherwise 0.
 *
 * @private
 */
function keyComparatorFn(keyA, keyB) {
  var a = parseInt(keyA.substr(1));
  var b = parseInt(keyB.substr(1));
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}


//============ world-data-model.js ===========================
/**
 * A wrapper data model object over Google DataTable object.
 *
 * @param {Object} data JS object equivalent of json world population data sent
 *    by app.
 * @constructor
 */
function WorldDataModel(data) {
  /**
   * World population data represented as Google Data Table.
   * This is a common model for different chart views.
   */
  this.dataTable_ = new google.visualization.DataTable();

  // various country code maps

  this.countryCodeToName_ = { };

  // Map of country code to index of row in dataTable_.
  this.countryCodeToIndex_ = { };

  // List of year labels in the data table.
  this.years_ = [ ];

  this.numberFormatter_ = new google.visualization.NumberFormat({
    pattern: '#,###',
  });

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
WorldDataModel.prototype.initializeYearDimension_ = function(data) {
  var me = this;

  var columnNames = data.columnNames;

  // Country column label.
  me.dataTable_.addColumn("string", columnNames.k0, 'k0');
  delete columnNames.k0;
  // skip Country code column label.
  delete columnNames.k1;
  
  // Add remaining column labels for years
  var sortedYearKeys = Object.keys(columnNames).sort(keyComparatorFn);
  sortedYearKeys.forEach(function(key) {
    var year = columnNames[key];
    me.dataTable_.addColumn('number', year);
    me.years_.push(parseInt(year));
  });

  return sortedYearKeys;
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
WorldDataModel.prototype.processCountryRow_ = function(countryRow, yearKeys, numCountries) {
  var countryDataTable = this.dataTable_;
  var numberFormatter = this.numberFormatter_;

  var countryName = countryRow['k0'];
  var countryCode = countryRow['k1'];
  this.countryCodeToName_[countryCode] = countryName;
  this.countryCodeToIndex_[countryCode] = numCountries;

  var dataRow = [];
  dataRow.push({v: countryCode, f:countryName});
  yearKeys.forEach(function(yearKey) {
    var value = {};
    if (!countryRow[yearKey] || countryRow[yearKey] == 0) {
      value.v = 0;
      value.f = 'n/a';
    } else {
      value.v = countryRow[yearKey];
      value.f = numberFormatter.formatValue(value.v);
    }
    dataRow.push(value);
  });
  countryDataTable.addRow(dataRow);

  return numCountries + 1;
};


/**
 * Initialized the data tables from the world population json data sent from
 *    the app.
 * @param {Object} data See above.
 *
 * @private
 */
WorldDataModel.prototype.initializeDataTable_ = function(data) {
  if (!data.columnNames || !data.dataRows || data.dataRows.length <= 0) {
   throw new Exception(
       "Invalid data: no column names and data rows found");
  }

  var columnNames = data.columnNames;
  if (!columnNames.k0 || !columnNames.k1) {
    throw new Exception(
        "Invalid data: Country Name and Country code must be present");
  }

  sortedYearKeys = this.initializeYearDimension_(data);

  var dataRows = data.dataRows;
  var me = this;
  var numCountries = 0;
  dataRows.forEach(function(dataRowAsDictionary) {
    numCountries = me.processCountryRow_(
      dataRowAsDictionary, sortedYearKeys, numCountries);
  });
};


/**
 * @param {number} rowIndex Row for which the array is requested.
 *
 * @return {Array.<Object>} A list of data values for the given rowIndex.
 */
WorldDataModel.prototype.getRowDataAsArray = function(rowIndex) {
  // Total columns = number of year labels + country label
  var numColumns = this.years_.length + 1;

  var row = [];
  for (var i = 0; i < numColumns; ++i) {
    row.push({v: this.dataTable_.getValue(rowIndex, i),
              f: this.dataTable_.getFormattedValue(rowIndex, i)});
  }

  return row;
};


/**
 * @param {string} countryCode for which the country name is retrieved.
 *
 * @return {string} The country name mapped to country code as key.
 */
WorldDataModel.prototype.countryCodeToName = function(countryCode) {
  return this.countryCodeToName_[countryCode];
};


/**
 * @param {string} countryCode for which the country name is retrieved.
 *
 * @return {number} The row index mapped to country code as key.
 */
WorldDataModel.prototype.countryCodeToIndex = function(countryCode) {
  return this.countryCodeToIndex_[countryCode];
};


/**
 * @return {Object} this.countryCodeToName_
 */
WorldDataModel.prototype.countryCodeToNameMap = function() {
  return this.countryCodeToName_;
};

/**
 * @return {Array.<number>} this.years_
 */
WorldDataModel.prototype.years = function() {
  return this.years_;
};


/**
 * @return {google.visualization.DataTable} this.dataTable_
 */
WorldDataModel.prototype.dataTable = function() {
  return this.dataTable_;
};


//=============== chart-selector-view.js ========================
/**
 * ChartSelectorView encapsulates the select/option nodes used to choose the
 * type of chart to display. The view triggers "change" event when a new value
 * is chosen. The controller provides the callback to be bound to the event.
 *
 * @param {Element} container The DOM element in
 * which the selector is to be rendered in.
 *
 * @constructor
 */
function ChartSelectorView(container) {
  this.container_ = container;
  this.initialized_ = false;

  this.chartLabels_ = { };
  this.chartLabels_[ChartView.LINE_CHART] = 'Line Chart';
  this.chartLabels_[ChartView.SCATTER_CHART] = 'Scatter Chart';

  this.selectedCallback_;
}


ChartSelectorView.prototype.initialize = function() {
  if (this.initialized_) return;

  // For each type of chart supported, add an option in the selector.
  for (key in this.chartLabels_) {
    this.addItem(key, this.chartLabels_[key]);
  }

  this.initialized_ = true;
};


/**
 * @param {number} id Used as value of the select option being added.
 * @param {string} label Used as the display name for option.
 */
ChartSelectorView.prototype.addItem = function(id, label) {
  this.container_.append('<option value="' + id + '">' + label + '</option>');
};


/**
 * Binds the given callback to "change" event that is triggered when a
 * different option value is chosen.
 *
 * @param {Function} selectedFn Callback to be called onChange.
 */
ChartSelectorView.prototype.bindCallbacks = function(selectedFn) {
  this.selectedCallback_ = selectedFn;
  this.container_.bind('change', selectedFn);
};


/**
 * Programmatically select an option and trigger the change event.
 *
 * @param {number} chartType The new option value to be set.
 */
ChartSelectorView.prototype.select = function(chartType) {
  this.container_.val('' + chartType);
  this.container_.trigger('change');
};


//================ country-selector-view.js =======================
/**
 * CountrySelectorView encapsulates a jQuery selectable dom node that allows
 * one or more of its child option nodes to be selected. The view triggers a
 * jQuery 'selected' and 'unselected' events (it triggers others too but we
 * don't care about those). The controller provides the callbacks to be bound
 * to these events.
 *
 * @param {Element} container The DOM element in which the selector is to be
 *    rendered in.
 *
 * @constructor
 */
function CountrySelectorView(container) {
  this.container_ = container;
  this.initialized_ = false;

  this.selectedCallback_;

  this.unSelectedCallback_;
}

/**
 * @param {Object} A countrycode -> country name map retrieved from the
 *    WorldDataModel.
 */
CountrySelectorView.prototype.initialize = function(countryData) {
  if (this.initialized_) return;

  if (!countryData) return;

  // For each country code -> country name pair, add a child div node that acts
  // as an option for the selectable container_.
  for (key in countryData) {
    this.addItem(key, countryData[key]);
  }

  this.initialized_ = true;
};

CountrySelectorView.prototype.addItem = function(countryCode, countryData) {
  this.container_.append(
      '<div class="ui-widget-content" id="' +
      countryCode + '">' + countryData + '</div>');
};

CountrySelectorView.prototype.removeItem = function() { };
CountrySelectorView.prototype.bindCallbacks = function(selectedFn, unselectedFn) {
  this.selectedCallback_ = selectedFn;
  this.unSelectedCallback_ = unselectedFn;
  this.container_.selectable({
    selected: selectedFn,
    unselected: unselectedFn,
  });
};


/**
 * Programmatically selects an option and trigger the 'selected' event.
 *
 * @param {number} countryCode  The new option value to be selected..
 */
CountrySelectorView.prototype.select = function(countryCode) {
  var item = $('#' + countryCode);
  item.addClass('ui-selected');
  this.selectedCallback_(null /* event */, {selected: item[0]}, true);
};


/**
 * Programmatically unselects an option and trigger the 'unselected' event.
 *
 * @param {number} countryCode  The new option value to be unselected..
 */
CountrySelectorView.prototype.unselect = function(countryCode) {
  var item = $('#' + countryCode);
  item.removeClass('ui-selected');
  this.unSelectedCallback_(null /* event */, {unselected: item[0]});
};

//================ chart-view.js =======================
/**
 * ChartView encapsulates 2 things:
 *   - The chart objects that are used render the line/scatter charts and
 *   manages any event triggered as result. This is the view portion of the
 *   class.
 *   - The dataTable object used to represent the data rendered by the
 *   charts. This is the model portion of the class.
 *
 * Ideally, the two should be separated but both are highly cohesive when it
 * comes to rendering and animation. Most of the logic in this class is to
 * manage the modification on the model and call the view to re-render itself.
 *
 * @param {Element} container1 The DOM element in which the first chart type is
 *    to be rendered in.
 * @param {Element} container2 The DOM element in which the second chart type is
 *    to be rendered in.
 * @constructor
 */
function ChartView(container1, container2) {
  // Maintains a map of ChartView.*CHART -> dom container
  this.containers_ = {};
  this.containers_[ChartView.LINE_CHART] = container1;
  this.containers_[ChartView.SCATTER_CHART] = container2;

  // Maintains a map of ChartView.*CHART -> google chart objects.
  this.charts_ = { };

  /**
   * The currently showing chart's type. One of the ChartView.*CHART values.
   * @type {number | undefined}
   */
  this.currentChartType_;

  /**
   * The currently showing chart object. One of the google chart objects.
   * @type {google.visualization.*Chart | undefined}
   */
  this.currentChart_;

  /**
   * The underlying data model to draw the line or scatter chart.
   * @type {google.visualization.DataTable | undefined}
   */
  this.dataTable_;

  /**
   * An object with draw options needed by google chart draw functionality.
   *
   * @type {Object}
   */
  this.drawOptions_;

  /**
   * All animation specifications are specified as part of this option.
   *
   * @type {Object}
  */
  this.animationOptions_;

  this.initialized_ = false;

  // The country code which is the last data line to be removed from a line or
  // scatter chart. We maintain this state as the last country line removal is
  // actual a no-op until a new line is added.
  //
  // Note that we will always remove the leftOverLine_ atomically with a new
  // country line. This atomicity is guaranteed by the country selector view.
  this.leftOverLine_ = '';

  // Set to true if the chart is drawing using a transition and the chart is
  // not ready. It is set to false, otherwise.
  this.isDrawing_ = false;
}


// Enum
ChartView.LINE_CHART = 0;
ChartView.SCATTER_CHART = 1;


/**
 * Initializes the view by creating instances of each chart that this view
 * manages. Also initialized the underlying data table to initialize with years
 * column (x-axis).
 *
 * @param {Array.<number>} years The list of years that are added as the values
 *    of x-axis in the line chart data table.
 */
ChartView.prototype.initialize = function(years) {
  if (this.initialized_) return;

  this.charts_[ChartView.LINE_CHART] =
    new google.visualization.LineChart(this.containers_[ChartView.LINE_CHART][0]);

  this.charts_[ChartView.SCATTER_CHART] =
    new google.visualization.ScatterChart(this.containers_[ChartView.SCATTER_CHART][0]);

  this.dataTable_ = new google.visualization.DataTable();
  this.dataTable_.addColumn('number', 'Year');
  for (var i = 0; i < years.length; ++i) {
    this.dataTable_.addRow([years[i]]);
  }

  this.animationOptions_ = {
    duration: 500,
    easing: 'linear',
  };

  this.drawOptions_ = {   // some animation stuff.
    hAxis: {format: '####'},
    chartArea: {
      left: 150,
      top: 50,
      height: 400,
    }
  };

  // Add 'ready' listener for which each chart object. We want to to be
  // notified when the chart is ready after an animation and set
  // this.isDrawing_ appropriately.
  for (c in this.charts_) {
    google.visualization.events.addListener(
        this.charts_[c], 'ready', $.proxy(this.setIsDrawing, this, false));
  }

  // A map from country code to data table column number which contains the
  // data for corresponding country line.
  this.countryCodeToColNum_ = { };
};


ChartView.prototype.enableAnimation = function() {
  this.drawOptions_.animation = this.animationOptions_;
};


ChartView.prototype.disableAnimation = function() {
  if (!!this.drawOptions_.animation) {
    delete this.drawOptions_.animation;
  }
};


/**
 * @param {number} chartType Either LINE_CHART or SCATTER_CHART to be set as
 *    the chart being rendered.
 */
ChartView.prototype.setCurrentChart = function(chartType) {
  // No-op if we are already showing that chart.
  if (this.currentChartType_ == chartType) return;

  // If there was a previous chart showing, hide it.
  if (this.currentChartType_ != undefined) {
    this.containers_[this.currentChartType_].hide();
  }
  this.containers_[chartType].show();

  this.currentChart_ = this.charts_[chartType];
  this.currentChartType_ = chartType;

  // Redraw the chart in case user made some changes to data model in the
  // previous chart type.
  this.redraw();
};


/**
 * Helper method for addCountryLine to take the row of a given country data
 * from WorldDataModel and insert it as a line column in the chart data model.
 *
 * @param {Object} countryData
 *
 * @private
 */
ChartView.prototype.addCountryLine_ = function(countryData, noIncremental) {
  var colNum = this.dataTable_.addColumn('number', countryData.countryName);
  var yearlyRows = countryData.yearlyRows;
  if (yearlyRows.length <= 0) return;

  var me = this;
  var rowNum = 0;

  yearlyRows.forEach(function(yearlyRow) {
    me.dataTable_.setCell(rowNum++, colNum, yearlyRow.v, yearlyRow.f);
    if (!noIncremental) {
      me.redraw();
    }
  });

  if (noIncremental) {
    me.redraw();
  }

  return colNum;
};


/**
 * @param {string} countryCode For which the country line is to be added to the chart.
 * @param {WorldDataModel} worldDataModel The model containing the ground truth
 *  of the data.
 */
ChartView.prototype.addCountryLine = function(countryCode, worldDataModel, noIncremental) {
  var countryName = worldDataModel.countryCodeToName(countryCode);
  var countryIndex = worldDataModel.countryCodeToIndex(countryCode);
  if (!countryName || countryIndex == undefined) return;

  log('adding line for ' + countryName + ' available in model at ' + countryIndex);

  var countryData = {
    countryName: countryName,
    yearlyRows: worldDataModel.getRowDataAsArray(countryIndex).slice(1),
  };

  log(countryData);

  this.countryCodeToColNum_[countryCode] = this.addCountryLine_(countryData, noIncremental);

  // If the last call to removeCountryLine was to the only one remaining
  // country line, we save it then, add the new country line first and then
  // remove it.
  if (this.leftOverLine_ != '') {
    this.removeCountryLine(this.leftOverLine_);
    this.leftOverLine_ = '';
  }
};


ChartView.prototype.removeCountryLine = function(countryCode) {
  var colNum = this.countryCodeToColNum_[countryCode];
  if (!colNum) return;

  var numCols = this.dataTable_.getNumberOfColumns();
  // If the only column is Years (x-axis), we can't expect to remove any more country columns.
  if (numCols < 2) {
     throw new Exception("Can not remove any more country line: " + countryCode);
  }

  // If we are trying to remove the only remaining country line from chart,
  // save it for removal when the first new country line is added.
  if (numCols == 2) {
    this.leftOverLine_ = countryCode;
    return;
  }

  this.dataTable_.removeColumn(colNum);
  delete this.countryCodeToColNum_[countryCode];
  this.redraw();

  // If a column has been removed, it will affect the column numbers added
  // after it. So updated the stored index in our map.
  for (code in this.countryCodeToColNum_) {
    if (this.countryCodeToColNum_[code] > colNum) {
      this.countryCodeToColNum_[code]--;
    }
  }
};


/**
 * @param {string} countryCode For which to test the existence.
 * @return {boolean} True if the chart is already showing a line for the given countryCode.
 */
ChartView.prototype.countryLineExists = function(countryCode) {
  return !!this.countryCodeToColNum_[countryCode];
};


/**
 * Simply calls the underlying current chart's draw functionality.
 */
ChartView.prototype.redraw = function() {
  if (!this.currentChart_) {
    throw new Exception("No chart type is selected!");
  }

  this.currentChart_.draw(this.dataTable_, this.drawOptions_);
};


/**
 * @param {boolean} isDrawing The new value for this.isDrawing_.
 */
ChartView.prototype.setIsDrawing = function(isDrawing) {
  this.isDrawing_ = isDrawing;
};


//================ table-view.js =======================
/**
 * @param {Element} container The DOM element in which the table view is to be
 *    rendered in.
 * @param {WorldDataModel} worldDataModel The model containing the ground truth.
 * @constructor
 */
function TableView(container, worldData) {
  this.container_ = container;
  this.table_;
  this.worldData_ = worldData;
  this.drawOptions_;
  this.initialized_ = false;
}

TableView.prototype.initialize = function() {
  if (this.initialized_) return;

  this.table_ = new google.visualization.Table(this.container_);

  this.drawOptions_ = {
    hAxis: {format: '####'},
  };

  this.initialized_ = true;
};


TableView.prototype.redraw = function() {
  this.table_.draw(this.worldData_.dataTable(), this.drawOptions_);
};


//================= viz-controller.js ======================
/**
 * The controller of the MVC pattern. It is responsible for following:
 *   - Initialize various views rendered on the page.
 *   - Initialize the model containing world population data.
 *   - Wire the events triggered on one view to effect on the data model and/or other view(s).
 *
 * @param {Object} data See above.
 * @constructor
 */
function VizController(data) {
  this.worldDataModel_ = new WorldDataModel(data);
  
  this.chartSelectorView_ = new ChartSelectorView($('#chart-type-selector'));

  this.countrySelectorView_ = new CountrySelectorView($('#country-selector'));
  
  this.chartView_ = new ChartView($('#line-chart-area'),
                                  $('#scatter-chart-area'));
  
  this.tableView_ = new TableView($('#table-container')[0], this.worldDataModel_);
}


/**
 * Render the data in table view.
 * Only involves operations on the TableView.
 */
VizController.prototype.showTableView = function() {
  this.tableView_.initialize();
  this.tableView_.redraw();
};


/**
 * Renders all the components to be shown as part of the charts tab.
 * It initializes a ChartSelectorView and listens to event on it to change the
 * type of chart shown by the ChartView.
 *
 * It also initializes a CountrySelectorView and listens to event on it to
 * change the data shown on the ChartView.
 *
 * It sets some reasonable default values for showing the plots on the charts
 * tab i.e. 'USA', 'GBR' and 'DEU' lines. It also chooses to show the page with
 * line chart by default.
 */
VizController.prototype.showDefaultChartView = function() {
  this.chartSelectorView_.initialize();
  this.chartSelectorView_.bindCallbacks($.proxy(this.onChartSelect_, this));

  this.countrySelectorView_.initialize(this.worldDataModel_.countryCodeToNameMap());
  this.countrySelectorView_.bindCallbacks($.proxy(this.onCountrySelect_, this),
                                          $.proxy(this.onCountryUnSelect_, this));
  this.chartView_.initialize(this.worldDataModel_.years());

  this.chartSelectorView_.select(ChartView.LINE_CHART);

  this.chartView_.disableAnimation();

  this.countrySelectorView_.select('USA');
  this.countrySelectorView_.select('GBR');
  this.countrySelectorView_.select('DEU');

  this.chartView_.enableAnimation();
};


/**
 * Callback for 'change' event on a select node of ChartSelectorView.
 *
 * @param {Event} event
 *
 * @private
 */
VizController.prototype.onChartSelect_ = function(event) {
  var value = $('#chart-type-selector').val();
  log('onselect ' + value);

  this.chartView_.setCurrentChart(parseInt(value));
};


/**
 * Callback for 'selected' jQuery event on the selectable node of
 * CountrySelectorView.
 *
 * @param {Event} event
 * @param {Object} ui A wrapper on the jQuery node that was selected as a
 *    result of this event.
 *
 * @private
 */
VizController.prototype.onCountrySelect_ = function(event, ui, opt_noIncremental) {
  if (!ui || !ui.selected || !ui.selected.id) return;
  log('onselect ' + ui.selected.id);
  if (this.chartView_.countryLineExists(ui.selected.id)) return;

  this.chartView_.addCountryLine(ui.selected.id, this.worldDataModel_, !!opt_noIncremental);
};


/**
 * Callback for 'unselected' jQuery event on the selectable node of
 * CountrySelectorView.
 *
 * @param {Event} event
 * @param {Object} ui A wrapper on the jQuery node that was unselected as a
 *    result of this event.
 *
 * @private
 */
VizController.prototype.onCountryUnSelect_ = function(event, ui) {
  if (!ui || !ui.unselected || !ui.unselected.id) return;
  log('onunselect ' + ui.unselected.id);
  if (!this.chartView_.countryLineExists(ui.unselected.id)) return;

  this.chartView_.removeCountryLine(ui.unselected.id, this.worldDataModel_);
};


/**
 * Creates a global singleton instance of VizController.
 *
 * @param {Object|undefined} opt_data The same data used to initialize the
 *    WorldDataModel.
 *
 * @return {VizController} the instance.
 */
VizController.getOrCreateInstance = function(opt_data) {
  if (!VizController.instance_) {
    if (!opt_data) {
      throw new Exception("Can not create a VizController instance without model data.");
    }
    VizController.instance_ = new VizController(opt_data);
  }

  return VizController.instance_;
};


/**
 * Namespace
 */
function UIUtils() { }

/**
 * Callback bound to the tab activate event on the main page.
 *
 * @param {Event} event
 * @param {Object} ui A wrapper on the jQuery node for the activated tab.
 */
UIUtils.onTabActivate = function(event, ui) {
  // No-op for any tab other tab 2.
  if (!ui.newPanel.is('#tabs-2')) return;
  
  var chartDiv = $('#chart-area');
  // If the chart has already been plotted once, no-op.
  if (chartDiv.children() > 0) return;

  var controller = VizController.getOrCreateInstance();
  controller.showDefaultChartView();
};
