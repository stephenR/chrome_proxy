var chromeProxyApp = angular.module('chromeProxyApp', []);
var tcpServer = chrome.sockets.tcpServer;
var tcp = chrome.sockets.tcp;

var forward_map = {};

var debug = true;

function d(msg) {
  if (debug) {
    console.log(msg);
  }
}

function server_create_callback(rule, create_info) {
  d('server_create_callback:');
  d(create_info);
  d(rule);
  
  rule.listen_socketId = create_info.socketId;

  tcpServer.listen(create_info.socketId, rule.listen_ip, rule.listen_port, callback=()=>{});
  tcpServer.onAccept.addListener(onaccept_callback.bind(undefined, rule));
}

function onaccept_callback(rule, info) {
  d('onaccept_callback:');
  d(info);

  tcp.create(callback=client_create_callback.bind(undefined, rule, info.clientSocketId));
}

function onreceive_callback(info){
  forward_socket = forward_map[info.socketId];
  tcp.send(forward_socket, info.data, ()=>{});
}

function client_create_callback(rule, sock_id, create_info) {
  d('client_create_callback:');
  d(sock_id);
  d(create_info);
  
  forward_map[sock_id] = create_info.socketId;
  forward_map[create_info.socketId] = sock_id;
  
  tcp.connect(create_info.socketId, rule.remote_addr, rule.remote_port, callback=client_connect_callback.bind(undefined, sock_id));
}

function client_connect_callback(sock_id, result) {
  d('client_connect_callback:');
  d(sock_id);
  d(result);

  tcp.setPaused(sock_id, false);
}

chromeProxyApp.controller('ProxyController', function ($scope) {
  
  $scope.createRule = function(rule) {
    rule = angular.copy(rule);
    d(rule);
    tcpServer.create(callback=server_create_callback.bind(undefined, rule));
    $scope.rules.push(rule);
  };
  
  $scope.reconnectRule = function() {
    tcpServer.close(this.rule.listen_socketId, () => {
      tcpServer.create(callback=server_create_callback.bind(undefined, this.rule));
    });
  };
  
  $scope.deleteRule = function() {
    index = $scope.rules.indexOf(this.rule);
    if (index > -1) {
      $scope.rules.splice(index, 1);
    }
  };
  
  tcp.onReceive.addListener(onreceive_callback);
  
  $scope.rules = [];
  var default_rule = {
      "listen_ip": "0.0.0.0",
      "listen_port": 1337,
      "remote_addr": "localhost",
      "remote_port": 8889
    };
  $scope.createRule(default_rule);
});

document.addEventListener('DOMContentLoaded', function(e) {
  var closeButton = document.querySelector('#close-button');
  closeButton.addEventListener('click', function(e) {
    window.close();
  });
});