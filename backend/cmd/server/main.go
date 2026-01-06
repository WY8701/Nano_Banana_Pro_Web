package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"image-gen-service/internal/api"
	"image-gen-service/internal/config"
	"image-gen-service/internal/model"
	"image-gen-service/internal/provider"
	"image-gen-service/internal/storage"
	"image-gen-service/internal/worker"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. 初始化配置
	config.InitConfig()

	// 2. 初始化数据库
	model.InitDB(config.GlobalConfig.Database.Path)

	// 3. 初始化存储
	var ossConfig map[string]string
	if config.GlobalConfig.Storage.OSS.Enabled {
		ossConfig = map[string]string{
			"endpoint":         config.GlobalConfig.Storage.OSS.Endpoint,
			"accessKeyID":     config.GlobalConfig.Storage.OSS.AccessKeyID,
			"accessKeySecret": config.GlobalConfig.Storage.OSS.AccessKeySecret,
			"bucketName":      config.GlobalConfig.Storage.OSS.BucketName,
			"domain":          config.GlobalConfig.Storage.OSS.Domain,
		}
	}
	storage.InitStorage(config.GlobalConfig.Storage.LocalDir, ossConfig)

	// 4. 初始化 Worker 池 (2C2G 服务器，推荐 6 个 worker)
	worker.InitPool(6, 100)
	worker.Pool.Start()

	// 5. 注册 Provider
	provider.InitProviders()

	// 5. 设置路由
	r := gin.Default()

	// 允许跨域请求 (如果前端在 5173，后端在 8080)
	// 注意：中间件必须在路由注册之前设置
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/health", func(c *gin.Context) {
		api.Success(c, gin.H{"status": "ok"})
	})

	v1 := r.Group("/api/v1")
	{
		v1.GET("/providers", api.ListProvidersHandler)
		v1.POST("/providers/config", api.UpdateProviderConfigHandler)
		v1.POST("/tasks/generate", api.GenerateHandler)
		v1.POST("/tasks/generate-with-images", api.GenerateWithImagesHandler)
		v1.GET("/tasks/:task_id", api.GetTaskHandler)
		v1.GET("/images", api.ListImagesHandler)
		v1.DELETE("/images/:id", api.DeleteImageHandler)
		v1.GET("/images/:id/download", api.DownloadImageHandler)
	}

	// 静态资源访问 (将 storage 目录整体暴露，以匹配数据库中的 storage/local/xxx.jpg 路径)
	r.Static("/storage", "storage")

	// 6. 优雅启动与关闭
	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("启动服务失败: %v", err)
		}
	}()

	// 等待中断信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("正在关闭服务...")

	// 优雅停止 Worker 池
	worker.Pool.Stop()

	// 优雅停止 HTTP 服务
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("服务器强制关闭:", err)
	}

	log.Println("服务已安全退出")
}
