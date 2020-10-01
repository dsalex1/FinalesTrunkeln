/*
 The MIT License (MIT)

 Original Copyright 2018 Phil Nash
 Modifications and addtions Copyright (c) 2015 Sonos, Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

import React, { Component } from 'react';
import './App.css';
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      speechText: '',
      hhOptions: [],
      playerOptions: [],
      playerId: '',

      useSonos:true,

      percentage: [12, 5, 11, 11, 11, 11, 12, 5, 8, 7, 7],

      currentCounter:  55,
      interval: 60,
      paused: true,

      firstTime: 0,
      
    };

    this.samples = ["Alle3Schluck", "AlleExen", "AlleJungs", "AlleMaedels", "JaNeinVerbot", "KeineVornamen", "Regel", "SitznachbarnBeruehren", "Submaster", "VerbindungErstellen", "Wasserfall"];

    this.textChange = this.textChange.bind(this);
    this.refresh = this.refresh.bind(this);
    this.hhChange = this.hhChange.bind(this);
    this.playerChange = this.playerChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

  }

// right off the bat, let's call our private API and get a list of the available hhs for this user
  componentDidMount() {
    this.refresh(); 

    setInterval(() => {
      console.log(this.state.paused)
      if (this.state.paused) return;

      if (this.state.firstTime === 0) {
        var r = Math.floor(Math.random() * (100 - 0 + 1) + 0);
        if (r > 90)
          this.playAudio("https://dsalex1.github.io/FinalesTrunkeln/lux/0BONUS_DO_NOT_INCLUDE_IN_POOL_AlexDaddy.wav");
        else
          this.playAudio("https://dsalex1.github.io/FinalesTrunkeln/lux/0BONUS_DO_NOT_INCLUDE_IN_POOL_HabbyBirthday.wav");
        this.setState({ firstTime: 1 });
      }
      this.setState({ currentCounter: this.state.currentCounter + 1 });
      
      if (this.state.firstTime === 1) {
        if (this.state.currentCounter >= 30) {
          this.select(this.samples[this.chooseOne()]);
          this.setState({ currentCounter: 0 });
          this.setState({ firstTime: 2 });

          document.getElementById("timer").innerHTML = "0 Sekunden"
        } else
          document.getElementById("timer").innerHTML = (30 - this.state.currentCounter) + " Sekunden"
      } else {
        if (this.state.currentCounter > this.state.interval) {
          this.select(this.samples[this.chooseOne()]);
          this.setState({ currentCounter: 0 });
        }
        document.getElementById("timer").innerHTML = (this.state.interval - this.state.currentCounter) + " Sekunden"
      }
    }, 1000);

    setInterval(()=>{
      this.playAudio("https://dsalex1.github.io/FinalesTrunkeln/BluetoothStall.wav");
    }, 1000 * 45);
  }
  playAudio(filename, filename2) {
    if (this.state.useSonos) {
      console.log("sonos")
      fetch(`/api/playURL?file=${encodeURIComponent(filename)}&playerId=${this.state.playerId}`)
        .then(response => response.json())
        .then(state => this.setState(state))
        .catch(err => this.setState({ error: err.stack }));
      setTimeout(() => fetch(`/api/playURL?file=${encodeURIComponent(filename2)}&playerId=${this.state.playerId}`)
        .then(response => response.json())
        .then(state => this.setState(state))
        .catch(err => this.setState({ error: err.stack })),5600)
    }else {
      if (filename2) {
        var a = new Audio(filename);
        a.addEventListener("ended", function () {
          a.currentTime = 0;
          var b = new Audio(filename2);
          b.play();
        });
        a.play();
      } else {
        a = new Audio(filename);
        a.play();
      }
    }
  }
  refresh() {
    fetch('/api/households')
      .then(response => response.json())
      .then(json => {
        if (json.success) { // alright, we got something
          if (json.households.length > 1) { // if there's more than one, we'll want to populate the picklist, because we'll be showing that
            const opts = [];
            for (let hh of json.households) {
              opts.push(<option value={hh.id}>{hh.id}</option>);
            }
            this.setState({
              hh: json.households[0].id,
              hhOptions: opts
            })
          }
          else { // if there's only one, let's just grab it. we won't even be showing the picklist
            this.setState({
              hh: json.households[0].id
            });
          }
          this.hhChange();
        }
        else if (json.authRequired) { // if we weren't successful, let's check and see if we've been told to auth, and if so, send user to auth endpoint
          window.location = 'http://localhost:3001/auth';
        }
        else { // if all else fails, just put an error on the screen and let the user figure it out
          this.setState({
            error: json.error
          });
        }
      });
  }


  textChange(event) {
    this.setState({ speechText: event.target.value });
  }

  playerChange(event) {
    this.setState({ playerId: event.target.value });
  }

// whenever the household changes, let's get a list of available speakers
  hhChange(event) {
    fetch(`/api/clipCapableSpeakers?household=${this.state.hh}`)
      .then(response => response.json())
      .then(json => {
        if (json.success) {
          const opts=[];
          for (let player of json.players) {
            opts.push(<option value={player.id}>{player.name}</option>);
          }
          this.setState({
            playerId: json.players[0].id,
            playerOptions: opts
          })
        }
        else {
          this.setState({
            error:json.error
          });
        }
      });

  }

  handleSubmit(event) {
    event.preventDefault();
    this.setState({ // here we're clearing out any error that might have been on the screen before
      error:''
    });
    fetch(`/api/speakText?text=${encodeURIComponent(this.state.speechText)}&playerId=${this.state.playerId}`)
      .then(response => response.json())
      .then(state => this.setState(state))
      .catch(err => this.setState({error:err.stack}));
  }

  pause() {
    this.setState({ paused: !this.state.paused });
  }

  select(name) {
    this.playAudio("https://dsalex1.github.io/FinalesTrunkeln/lux/QueuePop2.wav"
             ,"https://dsalex1.github.io/FinalesTrunkeln/lux/" + name + ".wav");
  }

  updateSlider(index, value) {
    value = Math.min(100, Math.max(0, value))
    let percentage = this.state.percentage

    let dif = percentage[index] - value;
    let whole = 100 - percentage[index]
    percentage[index] = percentage[index] - dif
    for (var i = 0; i < this.samples.length; i++) {
      var nV = percentage[i] + percentage[i] * dif / whole;
      if (Number.isNaN(nV)) nV = 0;
      if (i !== index) {
        percentage[i] = Math.min(100, Math.max(0, nV))
      }
    }
    this.setState({ percentage });
  }

  chooseOne() {
    var r = Math.floor(Math.random() * (100 - 0 + 1) + 0);
    var cur = 0;
    for (var i = 0; i < this.samples.length - 1; i++) {
      if (cur + this.state.percentage[i] >= r && r < cur + this.state.percentage[i] + this.state.percentage[i + 1] && !this.state.percentage[i].toString().startsWith("0")) return i;
      cur = cur + this.state.percentage[i];
    }
    return this.samples.length - 1;
  }

  changeTimer(value) {
    this.setState({ interval: Math.max(10, value) });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <h2>
            Sonos Text to Speech.
          </h2>
          <form onSubmit={this.handleSubmit}>
            <div id="hhSelector" style={{display: this.state.hhOptions.length > 1?'block':'none'}}>
                <label htmlFor="targetHH">Select your target household: </label>
                <select
                  id="targetHH"
                  onChange={this.hhChange}
                  value={this.state.hh}
                >
                  {this.state.hhOptions}
                </select><br/>
            </div>
          <label htmlFor="targetPlayer">Select your target player: </label>
            <select
              id="targetPlayer"
              value={this.state.playerId}
              onChange={this.playerChange}
            >
              {this.state.playerOptions}
            </select><br/>
            <label htmlFor="speechText">Enter your text to speak: </label>
            <input
              id="speechText"
              type="text"
              value={this.state.speechText}
              onChange={this.textChange}
            /><br/>
          <button type="submit" disabled={!this.state.speechText}>Submit</button>
          </form>
          {this.state.error}
          <main>
            <div>
              <label>
                use Sonos
                <input
                    type="checkbox"
                    checked={this.state.useSonos}
                    onChange={()=>this.setState({useSonos:!this.state.useSonos})} />
                </label>
            </div>
          <div id="main">
              {this.samples.map((sample, i) => (
                <div key={i}>
                  <button onClick={() => this.select(this.samples[i])}>Play</button>
                  <input type='range' min='0' max='100' className='slider' value={this.state.percentage[i]} onChange={(e) => this.updateSlider(i, e.target.value)}></input>
                  <input type='number' min='0' max='100' value={this.state.percentage[i]} onChange={(e) => this.updateSlider(i, e.target.value)}></input>{this.samples[i]}
                </div>
              ))}
    
            </div>
            <br />
            <div>
              <button id='pause' onClick={() => this.pause()}>{!this.state.paused?"Pause":"Continue"}</button>
              <input type='number' min='5' id='interval' value={this.state.interval} onChange={(e) => this.changeTimer(e.target.value)}></input>
              <span id='timer'></span>
            </div>
          </main>
        </header>
      </div>
    );
  }
}

export default App;
