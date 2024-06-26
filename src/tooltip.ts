/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */
import powerbi from "powerbi-visuals-api";
import DataViewValueColumn = powerbi.DataViewValueColumn;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewCategorical = powerbi.DataViewCategorical;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

import {
    valueFormatter
} from "powerbi-visuals-utils-formattingutils";

// powerbi.extensibility.utils.formatting

export const DisplayNameSeparator: string = "/";

export interface TooltipSeriesDataItem {
    value?: any;
    highlightedValue?: any;
    metadata: DataViewValueColumn;
}

export interface TooltipCategoryDataItem {
    value?: any;
    metadata: DataViewMetadataColumn[];
}

export function createTooltipInfo(
    dataViewCat: DataViewCategorical,
    categoryValue: any,
    localizationManager: ILocalizationManager,
    value?: any,
    categories?: DataViewCategoryColumn[],
    seriesData?: TooltipSeriesDataItem[],
    seriesIndex?: number,
    categoryIndex?: number,
    highlightedValue?: any): VisualTooltipDataItem[] {

    let categorySource: TooltipCategoryDataItem,
        valuesSource: DataViewMetadataColumn = undefined;
    
    const seriesSource: TooltipSeriesDataItem[] = [];
    seriesIndex = seriesIndex | 0;

    const categoriesData: DataViewCategoryColumn[] = dataViewCat
        ? dataViewCat.categories
        : categories;

    if (categoriesData && categoriesData.length > 0) {
        if (categoriesData.length > 1) {
            const compositeCategoriesData: DataViewMetadataColumn[] = [];

            for (let i: number = 0; i < categoriesData.length; i++) {
                compositeCategoriesData.push(categoriesData[i].source);
            }

            categorySource = {
                value: categoryValue,
                metadata: compositeCategoriesData
            };
        }
        else {
            categorySource = {
                value: categoryValue,
                metadata: [categoriesData[0].source]
            };
        }
    }

    if (dataViewCat && dataViewCat.values) {
        if (!categorySource
            || !(categorySource.metadata[0] === dataViewCat.values.source)) {
            valuesSource = dataViewCat.values.source;
        }

        if (dataViewCat.values.length > 0) {
            const valueColumn: DataViewValueColumn = dataViewCat.values[seriesIndex],
                isAutoGeneratedColumn: boolean = !!(valueColumn
                    && valueColumn.source
                    && (valueColumn.source as any).isAutoGeneratedColumn);

            if (!isAutoGeneratedColumn) {
                seriesSource.push({
                    value,
                    highlightedValue,
                    metadata: valueColumn
                });
            }
        }
    }

    if (seriesData) {
        for (let i: number = 0; i < seriesData.length; i++) {
            const singleSeriesData: TooltipSeriesDataItem = seriesData[i];

            if (categorySource
                && categorySource.metadata[0] === singleSeriesData.metadata.source) {
                continue;
            }

            seriesSource.push({
                value: singleSeriesData.value,
                metadata: singleSeriesData.metadata
            });
        }
    }

    return createTooltipData(categorySource, valuesSource, seriesSource, localizationManager);
}

export function createTooltipData(
    categoryValue: TooltipCategoryDataItem,
    valuesSource: DataViewMetadataColumn,
    seriesValues: TooltipSeriesDataItem[],
    localizationManager: ILocalizationManager): VisualTooltipDataItem[] {

    const items: VisualTooltipDataItem[] = [];

    if (categoryValue) {
        if (categoryValue.metadata.length > 1) {
            let displayName: string = "";

            for (let i: number = 0; i < categoryValue.metadata.length; i++) {
                if (i !== 0) {
                    displayName += DisplayNameSeparator;
                }

                displayName += categoryValue.metadata[i].displayName;
            }

            const categoryFormattedValue: string = getFormattedValue(
                categoryValue.metadata[0],
                categoryValue.value);

            items.push({
                displayName,
                value: categoryFormattedValue
            });
        }
        else {
            const categoryFormattedValue: string = getFormattedValue(
                categoryValue.metadata[0],
                categoryValue.value);

            items.push({
                displayName: categoryValue.metadata[0].displayName,
                value: categoryFormattedValue
            });
        }
    }

    if (valuesSource) {
        // Dynamic series value
        let dynamicValue: string;

        if (seriesValues.length > 0) {
            const dynamicValueMetadata: DataViewMetadataColumn = seriesValues[0].metadata.source;

            dynamicValue = getFormattedValue(
                valuesSource,
                dynamicValueMetadata.groupName);
        }

        items.push({
            displayName: valuesSource.displayName,
            value: dynamicValue
        });
    }

    for (let i: number = 0; i < seriesValues.length; i++) {
        const seriesData: TooltipSeriesDataItem = seriesValues[i];

        if (seriesData && seriesData.metadata) {
            const seriesMetadataColumn: DataViewMetadataColumn = seriesData.metadata.source,
                value: any = seriesData.value,
                highlightedValue: any = seriesData.highlightedValue;

            if (value || value === 0) {
                const formattedValue: string = getFormattedValue(
                    seriesMetadataColumn,
                    value);

                items.push({
                    displayName: seriesMetadataColumn.displayName,
                    value: formattedValue
                });
            }

            if (highlightedValue || highlightedValue === 0) {
                const formattedHighlightedValue: string = getFormattedValue(
                    seriesMetadataColumn,
                    highlightedValue);

                items.push({
                    displayName: localizationManager.getDisplayName("Visual_HighlightedValueDisplayName"),
                    value: formattedHighlightedValue
                });
            }
        }
    }

    return items;
}

export function getFormattedValue(column: DataViewMetadataColumn, value: any): string {
    const formatString: string = getFormatStringFromColumn(column);

    return valueFormatter.format(value, formatString);
}

export function getFormatStringFromColumn(column: DataViewMetadataColumn): string {
    if (!column) {
        return null;
    }

    const formatString: string =
        valueFormatter.getFormatStringByColumn(column, true);

    return formatString || column.format;
}
