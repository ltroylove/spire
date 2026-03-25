package controllers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/EQEmuTools/spire/internal/auditlog"
	"github.com/EQEmuTools/spire/internal/database"
	"github.com/EQEmuTools/spire/internal/http/routes"
	"github.com/EQEmuTools/spire/internal/models"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type TaskClassRestrictionsController struct {
	db       *database.Resolver
	auditLog *auditlog.UserEvent
}

type taskClassRestrictionsResponse struct {
	Supported      bool `json:"supported"`
	AllowedClasses uint `json:"allowed_classes"`
}

type taskClassRestrictionsRequest struct {
	AllowedClasses uint `json:"allowed_classes"`
}

func NewTaskClassRestrictionsController(
	db *database.Resolver,
	auditLog *auditlog.UserEvent,
) *TaskClassRestrictionsController {
	return &TaskClassRestrictionsController{
		db:       db,
		auditLog: auditLog,
	}
}

func (t *TaskClassRestrictionsController) Routes() []*routes.Route {
	return []*routes.Route{
		routes.RegisterRoute(http.MethodGet, "task/:id/class-restrictions", t.getTaskClassRestrictions, nil),
		routes.RegisterRoute(http.MethodPatch, "task/:id/class-restrictions", t.updateTaskClassRestrictions, nil),
	}
}

func (t *TaskClassRestrictionsController) getTaskClassRestrictions(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Cannot find param [Id]"})
	}

	db := t.db.Get(models.Task{}, c)
	supported, err := t.supportsAllowedClasses(db)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	if !supported {
		return c.JSON(http.StatusOK, taskClassRestrictionsResponse{
			Supported:      false,
			AllowedClasses: 0,
		})
	}

	var result struct {
		AllowedClasses uint `json:"allowed_classes"`
	}

	err = db.Table("tasks").Select("allowed_classes").Where("id = ?", id).Take(&result).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.JSON(http.StatusNotFound, echo.Map{"error": "Cannot find entity"})
		}

		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, taskClassRestrictionsResponse{
		Supported:      true,
		AllowedClasses: result.AllowedClasses,
	})
}

func (t *TaskClassRestrictionsController) updateTaskClassRestrictions(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "Cannot find param [Id]"})
	}

	request := new(taskClassRestrictionsRequest)
	if err := c.Bind(request); err != nil {
		return c.JSON(
			http.StatusBadRequest,
			echo.Map{"error": fmt.Sprintf("Error binding to entity [%v]", err.Error())},
		)
	}

	db := t.db.Get(models.Task{}, c)
	supported, err := t.supportsAllowedClasses(db)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": err.Error()})
	}

	if !supported {
		return c.JSON(
			http.StatusConflict,
			echo.Map{"error": "This database does not support tasks.allowed_classes"},
		)
	}

	result := db.Table("tasks").Where("id = ?", id).Update("allowed_classes", request.AllowedClasses)
	if result.Error != nil {
		return c.JSON(
			http.StatusInternalServerError,
			echo.Map{"error": fmt.Sprintf("Error updating entity [%v]", result.Error.Error())},
		)
	}

	if result.RowsAffected == 0 {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "Cannot find entity"})
	}

	if t.db.GetSpireDb() != nil {
		event := fmt.Sprintf(
			"Updated [Task] [id = %d] fields [allowed_classes = %d]",
			id,
			request.AllowedClasses,
		)
		t.auditLog.LogUserEvent(c, "UPDATE", event)
	}

	return c.JSON(http.StatusOK, taskClassRestrictionsResponse{
		Supported:      true,
		AllowedClasses: request.AllowedClasses,
	})
}

func (t *TaskClassRestrictionsController) supportsAllowedClasses(db *gorm.DB) (bool, error) {
	schema, err := database.GetTableSchema(db, "tasks")
	if err != nil {
		return false, err
	}

	for _, column := range schema {
		if strings.EqualFold(column.Column, "allowed_classes") {
			return true, nil
		}
	}

	return false, nil
}
