/*
Copyright (c) 2019 the Octant contributors. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
*/

package plugin

import (
	"github.com/hashicorp/go-plugin"
	"github.com/spf13/viper"
	"google.golang.org/grpc"
)

var (
	// Handshake is the handshake configuration for plugins. Will
	// be used the dashboard and the plugin.
	Handshake = plugin.HandshakeConfig{
		ProtocolVersion:  1,
		MagicCookieKey:   "DASHBOARD_PLUGIN",
		MagicCookieValue: "dashboard",
	}
)

// CustomGRPCServer creates a gRPC server with increased message size limits
func CustomGRPCServer(opts []grpc.ServerOption) *grpc.Server {
	maxMsgSize := viper.GetInt("client-max-recv-msg-size")
	opts = append(opts,
		grpc.MaxRecvMsgSize(maxMsgSize),
		grpc.MaxSendMsgSize(maxMsgSize),
	)
	return grpc.NewServer(opts...)
}

// Serve serves a plugin.
func Serve(service Service) {
	plugin.Serve(&plugin.ServeConfig{
		HandshakeConfig: Handshake,
		Plugins: plugin.PluginSet{
			Name: &ServicePlugin{Impl: service},
		},
		GRPCServer: CustomGRPCServer,
	})
}
