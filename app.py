import os
from csv import reader
from flask import jsonify
from flask import Flask
from flask import render_template

app = Flask(__name__)
app.config['DEBUG'] = True

@app.route('/')
def index():
    return render_template('index.html')

EMPTY_JSON = '{}'

# This route reads the csv 
@app.route('/worlddata')
def world_data():
  csvfile = open('world-pop.csv', 'rb')
  if csvfile is None:
    return EMPTY_JSON
  rows = reader(csvfile)
  first_row = rows.next()
  if first_row is None:
    return EMPTY_JSON

  world_data_dict = {}

  column_names = {}
  counter = 0;
  key_prefix = 'k%d'
  # First row is supposed to be the names of keys of the dict/json.
  for col in first_row:
    column_names[key_prefix % counter] = col
    counter += 1

  world_data_dict['columnNames'] = column_names

  data_rows = []
  for row in rows:
    data_row = {}
    data_row['k0'] = row[0];
    data_row['k1'] = row[1];
    index = 2
    for col in row[2:]:
      try:
        # The value of population could be a float.
        data_row[key_prefix % index] = int(float(col))
      except ValueError:
        try:
          # or an int
          data_row[key_prefix % index] = int(col)
        except ValueError:
          # or no value specified.
          data_row[key_prefix % index] = 0

      index += 1
    data_rows.append(data_row)

  world_data_dict['dataRows'] = data_rows

  return jsonify(world_data_dict)


if __name__ == '__main__':
    # Bind to PORT if defined, otherwise default to 5000.
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
