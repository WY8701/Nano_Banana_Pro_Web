package storage

import (
	"bytes"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"github.com/disintegration/imaging"
)

// Storage 定义存储接口
type Storage interface {
	Save(name string, reader io.Reader) (string, string, error)                                                               // 返回 (localPath, remoteURL, error)
	SaveWithThumbnail(name string, reader io.Reader) (string, string, string, string, int, int, error) // 返回 (localPath, remoteURL, thumbLocalPath, thumbRemoteURL, width, height, error)
	Delete(name string) error
}

// LocalStorage 本地存储实现
type LocalStorage struct {
	BaseDir string
}

func (l *LocalStorage) Save(name string, reader io.Reader) (string, string, error) {
	path := filepath.Join(l.BaseDir, name)
	// 确保目录存在
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", "", fmt.Errorf("创建目录失败: %w", err)
	}

	file, err := os.Create(path)
	if err != nil {
		return "", "", fmt.Errorf("创建本地文件失败: %w", err)
	}
	defer file.Close()

	_, err = io.Copy(file, reader)
	if err != nil {
		return "", "", fmt.Errorf("写入本地文件失败: %w", err)
	}

	return path, "", nil
}

func (l *LocalStorage) SaveWithThumbnail(name string, reader io.Reader) (string, string, string, string, int, int, error) {
	// 1. 先保存原始文件
	localPath, _, err := l.Save(name, reader)
	if err != nil {
		return "", "", "", "", 0, 0, err
	}

	// 2. 生成缩略图并获取原图尺寸
	thumbName := "thumb_" + name
	thumbPath := filepath.Join(l.BaseDir, thumbName)

	srcImg, err := imaging.Open(localPath)
	if err != nil {
		return localPath, "", "", "", 0, 0, fmt.Errorf("打开原图生成缩略图失败: %w", err)
	}

	// 获取原图尺寸
	width := srcImg.Bounds().Dx()
	height := srcImg.Bounds().Dy()

	// 生成 256x256 的等比例缩略图
	dstImg := imaging.Thumbnail(srcImg, 256, 256, imaging.Lanczos)
	if err := imaging.Save(dstImg, thumbPath); err != nil {
		return localPath, "", "", "", width, height, fmt.Errorf("保存缩略图失败: %w", err)
	}

	return localPath, "", thumbPath, "", width, height, nil
}

func (l *LocalStorage) Delete(name string) error {
	path := filepath.Join(l.BaseDir, name)
	err := os.Remove(path)

	// 同时尝试删除缩略图
	thumbPath := filepath.Join(l.BaseDir, "thumb_"+name)
	_ = os.Remove(thumbPath)

	return err
}

// OSSStorage 阿里云 OSS 存储实现
type OSSStorage struct {
	Bucket *oss.Bucket
	Domain string // OSS 访问域名
}

func (s *OSSStorage) Save(name string, reader io.Reader) (string, string, error) {
	err := s.Bucket.PutObject(name, reader)
	if err != nil {
		return "", "", fmt.Errorf("OSS 上传失败: %w", err)
	}

	url := fmt.Sprintf("https://%s/%s", s.Domain, name)
	return "", url, nil
}

func (s *OSSStorage) SaveWithThumbnail(name string, reader io.Reader) (string, string, string, string, int, int, error) {
	// OSS 本身支持图片处理，这里简单处理：先上传原图，再上传缩略图（或者利用 OSS 图片处理参数）
	// 为了代码统一性，我们手动生成并上传缩略图
	
	// 由于 reader 只能读一次，我们需要读取到内存或先存本地
	data, err := io.ReadAll(reader)
	if err != nil {
		return "", "", "", "", 0, 0, err
	}

	// 上传原图
	_, remoteURL, err := s.Save(name, bytes.NewReader(data))
	if err != nil {
		return "", "", "", "", 0, 0, err
	}

	// 生成缩略图并获取尺寸
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return "", remoteURL, "", "", 0, 0, fmt.Errorf("解码图片失败: %w", err)
	}

	width := img.Bounds().Dx()
	height := img.Bounds().Dy()

	dstImg := imaging.Thumbnail(img, 256, 256, imaging.Lanczos)

	buf := new(bytes.Buffer)
	if err := imaging.Encode(buf, dstImg, imaging.JPEG); err != nil {
		return "", remoteURL, "", "", width, height, fmt.Errorf("编码缩略图失败: %w", err)
	}

	// 上传缩略图
	thumbName := "thumb_" + name
	_, thumbRemoteURL, err := s.Save(thumbName, buf)
	if err != nil {
		return "", remoteURL, "", "", width, height, fmt.Errorf("上传缩略图到 OSS 失败: %w", err)
	}

	return "", remoteURL, "", thumbRemoteURL, width, height, nil
}

func (s *OSSStorage) Delete(name string) error {
	err := s.Bucket.DeleteObject(name)
	// 同时删除缩略图
	_ = s.Bucket.DeleteObject("thumb_" + name)
	return err
}

// CompositeStorage 同时支持本地和 OSS
type CompositeStorage struct {
	Local *LocalStorage
	OSS   *OSSStorage
}

func (c *CompositeStorage) Save(name string, reader io.Reader) (string, string, error) {
	// 保持原样，仅为了接口兼容
	return c.Local.Save(name, reader)
}

func (c *CompositeStorage) SaveWithThumbnail(name string, reader io.Reader) (string, string, string, string, int, int, error) {
	// 1. 先保存到本地并生成缩略图
	localPath, _, thumbLocalPath, _, width, height, err := c.Local.SaveWithThumbnail(name, reader)
	if err != nil {
		return "", "", "", "", 0, 0, err
	}

	remoteURL := ""
	thumbRemoteURL := ""
	if c.OSS != nil {
		// 2. 上传原图到 OSS
		file, err := os.Open(localPath)
		if err == nil {
			_, remoteURL, _ = c.OSS.Save(name, file)
			file.Close()
		}

		// 3. 上传缩略图到 OSS
		thumbFile, err := os.Open(thumbLocalPath)
		if err == nil {
			_, thumbRemoteURL, _ = c.OSS.Save("thumb_"+name, thumbFile)
			thumbFile.Close()
		}
	}

	return localPath, remoteURL, thumbLocalPath, thumbRemoteURL, width, height, nil
}

func (c *CompositeStorage) Delete(name string) error {
	var errs []string
	if err := c.Local.Delete(name); err != nil {
		errs = append(errs, fmt.Sprintf("本地删除失败: %v", err))
	}

	if c.OSS != nil {
		if err := c.OSS.Delete(name); err != nil {
			errs = append(errs, fmt.Sprintf("OSS 删除失败: %v", err))
		}
	}

	if len(errs) > 0 {
		return fmt.Errorf("删除过程出错: %s", strings.Join(errs, "; "))
	}
	return nil
}

var GlobalStorage Storage

// InitStorage 初始化存储组件
func InitStorage(localDir string, ossConfig map[string]string) {
	local := &LocalStorage{BaseDir: localDir}

	var ossStorage *OSSStorage
	if ossConfig != nil {
		client, err := oss.New(ossConfig["endpoint"], ossConfig["accessKeyID"], ossConfig["accessKeySecret"])
		if err == nil {
			bucket, err := client.Bucket(ossConfig["bucketName"])
			if err == nil {
				ossStorage = &OSSStorage{
					Bucket: bucket,
					Domain: ossConfig["domain"],
				}
			}
		}
	}

	GlobalStorage = &CompositeStorage{
		Local: local,
		OSS:   ossStorage,
	}
}
