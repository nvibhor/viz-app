viz-app
=======

A simple world population data visualization tool.

The tool has following components:
- A python based web server written using the Flask framework. The web server exports only 2 interface:
  - / : index html page available at templates/index.html
  - /worlddata : a json version of the world-pop.csv There are a couple of data sanitization that the app does on the csv.
      * All missing population numbers (i.e. ',,') are treated as 0 (or not-available).
      * All floating point numbers are only parsed for the integral part (i.e. floor() for positive values).

- A javascript based client app available at static/main.js The client is developed using Model-View-Controller pattern as follows:
  - VizController: controller that takes care of initializing various views and model(s) and wiring the event triggered on one view to other views and/or models.
  - WorldDataModel: The model encapsulating the world population data returned as json by the web server.
  - ChartView, TableView, {Foo}SelectorView: The views corresponding to the different visual component on the page.
  - Initialization: Most of the client shell is written in templates/index.html with a trivial amount of post-onload javascript to initialize the controller and let it render the default page.
  - Styling: static/main.css contains all the style attributes. A few of the style classes are pre-defined from jQuery UI are are decorated to meet the look and feel with rest of the app.
