import React, { Component } from 'react';
import './App.css';
import 'font-roboto/dist/styles/roboto.css';
import 'font-awesome/css/font-awesome.css';
import openSocket from 'socket.io-client'
import Api  from './Api'

const socket = openSocket(window._SERVER)



class App extends Component {

  state = {
    name: "",
    ytUrl: "",
    search: "",
    id: "",
    disControl: false,
    isLogin: false,
    alertMsg: null,
    playState: false,
    isConnected: true,
    playerTitle: '- Idle',
    listType: 1, // 1 Queue, 2 Saved
    optionList: false,
    party: [
      "pedox", "dox", "umuld"
    ],
    queue: [
    ],
    saved: [
      
    ]

  }

  constructor() {
    super()
    this.onJoin = this.onJoin.bind(this)
    this.alertToggle = this.alertToggle.bind(this)
    this.changeList = this.changeList.bind(this)
  }

  componentDidMount() {
    socket.on('session', (d) => {
      if(d.join) {
        this.setState({
          isLogin: true,
          name: d.name
        })
      }
    })

    socket.on('connect', (d) => {
      console.log(`connected...`)
      this.setState({isConnected: true})
      this.loadSavedList()
    })

    socket.on('disconnect', (d) => {
      this.setState({isConnected: false})
    })

    socket.on('reconnect_failed', (d) => {
      this.setState({isConnected: true})
    })

    socket.on('playerState', (state) => {
      this.setState(state)
    })

    socket.on('onError', (alertMsg) => {
      this.setState({alertMsg})
    })
  }

  renderPlayer() {
    const {optionList, queue} = this.state
    
    console.log(queue)
    return (
      <div className="player-outer">
        <div className="main-ui player">
          <header>
            <div className="line"></div>
            <a href="#" onClick={(e) => this.toggleMainMenu(e)} className="m-menu"></a>
            <h1>Jukebox</h1>
          </header>
          <div className="inner">
            <div className="current-play b-black g-color">
              <p className={this.state.playerTitle.length > 75 ? "animated" : ""}>{this.state.playerTitle}</p>
            </div>
            <div className="control">
              <button disabled={this.state.disControl} onClick={(e) => this.togglePlay(e, 0)}>
                {this.state.playState ? <i className="fa fa-pause"></i> : <i className="fa fa-play"></i>}
              </button>
              <button disabled={this.state.disControl} onClick={(e) => this.togglePlay(e, 1)}><i className="fa fa-step-backward"></i></button>
              <button disabled={this.state.disControl} onClick={(e) => this.togglePlay(e, 2)}><i className="fa fa-step-forward"></i></button>
              <form disabled={this.state.disControl} onSubmit={(e) => this.addMusic(e)}>
                <input 
                  type="text" 
                  placeholder="Paste Youtube URL Here" 
                  className="input-text g-color b-black"
                  onChange={this.handleChange.bind(this, 'ytUrl')} 
                  disabled={this.state.disControl}
                  value={this.state.ytUrl} 
                  />
                <button 
                  disabled={this.state.disControl}
                  type="submit">Add <i className="fa fa-chevron-right"></i>
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="main-ui playlist">
          <header>
            <div className="line"></div>
            <h1>{this.state.listType == 1 ? "Queue lists" : "Saved Music"}</h1>
          </header>
          <div className="inner">
            <div className="list b-black">
              <ol>
                {this.state.listType == 1 ? 
                  this.state.queue.map((d, i) => {
                    return <li key={i} className={d.active == 1 && "playing"}>{d.user}</li>
                  }) :
                  optionList !== false ? 
                  <div className="option-list">
                    <div className="track-name">{optionList.title}</div>
                    <div className="track-name">{optionList.playCount} Played</div>
                    <div className="action">
                      <a href="#" onClick={(e) => this.setTrackAction(optionList, 1, e)}>Add to Queue</a>
                      <a href="#" onClick={(e) => this.setTrackAction(optionList, null, e)}>Back to the list</a>
                      <a href="#" onClick={(e) => this.setTrackAction(optionList, 3, e)}>Delete track</a> 
                    </div>
                  </div> :
                  this.state.saved.map((d, i) => {
                    return <li key={i} className={d.active == 1 && "playing"} onClick={() => this.setTrackAction(i, 0)}>{d.title}</li>
                  })
                }
              </ol>
            </div>
            <div className="control">
              <button onClick={() => this.changeList(1)}>Queue</button>
              <button onClick={() => this.changeList(2)}>Saved</button>
              {this.state.listType == 2 && this.state.optionList === false ? 
                <form onSubmit={(e) => this.searchList(e)}>
                  <input 
                    type="text"
                    placeholder="Search" 
                    className="input-text g-color b-black"
                    onChange={this.handleChange.bind(this, 'search')} 
                    value={this.state.search} 
                    />
                </form> : 
                <p className="l-info">Logged in as {this.state.name}</p>
              }
            </div>
          </div>
        </div>
      </div>
    )
  }

  renderLogin() {
    return (
      <div className="auth-login">
        <div className="main-ui join-party">
            <header>
              <div className="line"></div>
              <h1>Join party</h1>
            </header>
            <div className="inner">
              <div className="control">
                <form onSubmit={(e) => this.onJoin(e)}>
                  <input 
                    type="text" 
                    placeholder="Input Username" 
                    onChange={this.handleChange.bind(this, 'name')} 
                    value={this.state.name} 
                    style={{width: '240px', float: 'left'}}
                    className="input-text g-color b-black"/>
                  <button type="submit">
                    Join <i className="fa fa-chevron-right"></i>
                  </button>
                </form>
              </div>
            </div>
        </div>
      </div>
    );
  }

  onJoin(e) {
    const { name } = this.state
    e.preventDefault()
    if(name.length < 0 || name == "") {
      this.alertToggle("Please insert your name")
    } else if(/^[a-z]+$/i.test(name) == false) {
      this.alertToggle("Only Chars a-z allowed")
    } else if(name.length > 10) {
      this.alertToggle("At Least your name must be under 10 chars")
    } else {
      socket.emit('join', name)
    }
  }

  toggleMainMenu() {

  }

  render() {
    let {isLogin, isConnected} = this.state
    return (
      <div className="App">
        {isConnected == false ? this.renderDisconnect() : isLogin ? this.renderPlayer() : this.renderLogin()}
        {this.renderAlert()}
      </div>
    );
  }

  renderDisconnect() {
    return (
      <div className="single-message">
        <div className="main-ui join-party">
            <header>
              <div className="line"></div>
              <h1>Jukebox</h1>
            </header>
            <div className="inner">
              <p>Player is offline...</p>            
              <p>Try Reconnecting ...</p>  
            </div>
        </div>
      </div>
    );
  }

  loadSavedList() {
    new Api().get('saved')
    .then(saved => {
        this.setState({saved})
    })
    .catch(e => {
      console.log(`Error fetch data`)
    })
  }

  togglePlay(e, state) {
    e.preventDefault()
    this.setState({
      disControl: true,
      playerTitle: 'Loading...'
    })
    socket.emit('playState', state)
    //this.setState({play})
  }

  renderAlert() {
    return this.state.alertMsg !== null && <div className="backdrop alert-window">
        <div className="main-ui alert">
          <header>
            <div className="line"></div>
            <h1>Alert</h1>
          </header>
          <p className="alert-msg">{this.state.alertMsg}</p>
          <div className="control">
            <button onClick={() => this.alertToggle(null)}>Ok</button> 
          </div>
        </div>
    </div>
  }

  setTrackAction(data, action = null, e) {
    if(e) e.preventDefault()
    var optionList = false
    console.log(data)
    switch(action) {
      case 0:
        optionList = this.state.saved[data]
        break;
      case 1:
          var { queue } = this.state

          var youtubeCodes = queue.map(d => d.comment)

          console.log(queue, youtubeCodes, data.url)
          
          if(youtubeCodes.indexOf(data.url) > -1) {
            this.alertToggle("Track already exist.")
          } else {
            var key = data.id
            var user = {
              name: this.state.name
            }
            socket.emit('addSavedToQueue', JSON.stringify({user, key}))
          }
        break;
      case 3:
        new Api().delete("delete/" + data.id)
        .then( () => {
          optionList = this.state.saved[data.id]
        })
       break;

    }
    this.setState({optionList})
  }

  changeList(type) {
    if(type == 2) {
      this.loadSavedList()
    }
    this.setState({listType: type, optionList: false})
  }

  searchList(e) {
    e.preventDefault()
    new Api().get("search", {
      title: this.state.search
    })
    .then(data => {
      console.log(data)
      this.setState({saved:data})
    })
  }

  addMusic(e) {
    var { ytUrl, queue } = this.state
    var youtubeCodes = queue.map(d => d.comment)
    var user = {
      name: this.state.name,
    }
    e.preventDefault()
    var m = ytUrl.match(/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/)
    
    if(m) {
      // is valid ..
      if(youtubeCodes.indexOf(m[5]) > -1) {

        this.alertToggle("Track already exist.")

      } else {  
        this.setState({
          ytUrl: '', 
          disControl: true,
          playerTitle: 'Adding to Queue (Please Wait)...'
          
        })
        socket.emit('addTrack', JSON.stringify({
          ytUrl, user
        }))
      }
      
      

    } else {
      this.alertToggle("Is not valid Youtube URL")
    }
    
  }

  alertToggle(msg) {
    this.setState({alertMsg: msg})
  }

  handleChange = (name, e) => {
    this.setState({...this.state, [name]: e.target.value});
  };
}

export default App;
