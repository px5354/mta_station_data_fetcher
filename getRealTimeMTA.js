#!/usr/bin/env node

const { prompt } = require('inquirer');
const csvtojson = require("csvtojson");
const fetch = require('node-fetch');

const SUBWAY_ROUTES_URL = 'http://traintimelb-367443097.us-east-1.elb.amazonaws.com/getSubwaylines';
const SUBWAY_STATIONS_URL = 'http://traintimelb-367443097.us-east-1.elb.amazonaws.com/getStationsByLine/';
const CSV_FILE_PATH = './stops.txt';

const getRoutes = async (url) => {
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json.map(e => e.id);
  } catch (error) {
    console.log('Error in getRoutes');
    console.log(error);
    process.exit(1);
  }
};

const getStations = async (url) => {
  try {
    const res = await fetch(url);
    let json = await res.json();
    json = JSON.parse(json);
    let stations = [];
    json.forEach(e => {
      stations = stations.concat(e.stations);
    });
    return stations.map(e => {
      return {
        id: e.id,
        name: e.name
      };
    });
  } catch (error) {
    console.log('Error in getStations');
    console.log(error);
    process.exit(1);
  }
};

const addCoordinatesToStations = (stations, coordinates) =>{
  return stations;
};

const importStops = async () => {
  // We create an object from the array for faster reading
  const stopsArr = await csvtojson().fromFile(CSV_FILE_PATH);
  const stopsObj = stopsArr.reduce((obj, item) => {
    obj[item.stop_id] = item; 
    return obj;
  }, {});
  return stopsObj;
}

const outputStops = (route, stops) => {
  console.log(`Stops of route ${route}:`);
  stops.forEach(s => {
    console.log(`- ${s.name} (${s.id}): ${s.stop_lat}, ${s.stop_lon}`);
  });
};


// main program
const stops = importStops();
const routes = getRoutes(SUBWAY_ROUTES_URL);

routes.then(data => {
  const choices = [
    {
      type : 'list',
      name : 'route',
      message : 'Please choose a line among the following ones: ',
      choices: data
    },
  ];
  prompt(choices).then((answers) =>{
    const stations = getStations(SUBWAY_STATIONS_URL + answers.route);
    stations.then(stations => {
      stops.then(stops => {
        mergedStops = [];
        stations.forEach(s => {
          s['stop_lat'] = stops[s.id]['stop_lat'];
          s['stop_lon'] = stops[s.id]['stop_lon'];
          mergedStops.push(s);
        });
        outputStops(answers.route, mergedStops);
      });
    });
  });
});
